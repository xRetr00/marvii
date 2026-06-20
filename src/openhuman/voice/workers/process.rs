use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};

const LOG_PREFIX: &str = "[voice-worker]";

#[derive(Debug, Clone, Serialize)]
pub(crate) struct VoiceRuntimeStatus {
    pub state: String,
    pub stage: Option<String>,
    pub error_detail: Option<String>,
    pub python_path: Option<String>,
    pub kws_model_path: Option<String>,
}

static SETUP_STATUS: once_cell::sync::Lazy<std::sync::Mutex<Option<VoiceRuntimeStatus>>> =
    once_cell::sync::Lazy::new(|| std::sync::Mutex::new(None));

#[derive(Debug, Deserialize)]
pub(crate) struct WorkerResponse {
    pub id: Option<u64>,
    #[serde(default)]
    pub ok: bool,
    #[serde(default)]
    pub keyword: String,
    #[serde(default)]
    pub tokens: Vec<String>,
    #[serde(default)]
    pub timestamps: Vec<f32>,
    #[serde(default)]
    pub candidate: String,
    #[serde(default)]
    pub matched_tokens: usize,
    #[serde(default)]
    pub total_tokens: usize,
    #[serde(default)]
    pub token_progress: f32,
    #[serde(default)]
    pub confidence_estimate: f32,
    pub error: Option<String>,
    pub load_ms: Option<u64>,
    pub cache_hit: Option<bool>,
    pub voice_ms: Option<u64>,
    pub synth_ms: Option<u64>,
    #[serde(rename = "type")]
    pub kind: Option<String>,
}

pub(crate) struct JsonLineWorker {
    name: &'static str,
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    next_id: u64,
}

impl JsonLineWorker {
    pub(crate) async fn spawn(
        name: &'static str,
        python: &Path,
        script: &Path,
        args: &[String],
        ready_timeout: Duration,
    ) -> Result<Self, String> {
        let started = std::time::Instant::now();
        let mut command = Command::new(python);
        command
            .arg(script)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let mut child = command
            .spawn()
            .map_err(|e| format!("{name} worker spawn failed: {e}"))?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| format!("{name} worker stdin unavailable"))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| format!("{name} worker stdout unavailable"))?;
        if let Some(stderr) = child.stderr.take() {
            tokio::spawn(async move {
                let mut lines = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    log::warn!("{LOG_PREFIX} name={name} stderr={line}");
                }
            });
        }
        let mut worker = Self {
            name,
            child,
            stdin,
            stdout: BufReader::new(stdout),
            next_id: 1,
        };
        let ready = worker.read_response(ready_timeout).await?;
        if ready.kind.as_deref() != Some("ready") {
            return Err(format!("{name} worker returned invalid ready response"));
        }
        log::info!(
            "{LOG_PREFIX} name={name} state=ready process_ms={} model_load_ms={:?}",
            started.elapsed().as_millis(),
            ready.load_ms
        );
        Ok(worker)
    }

    pub(crate) async fn request(
        &mut self,
        mut payload: Value,
        timeout: Duration,
    ) -> Result<WorkerResponse, String> {
        let id = self.next_id;
        self.next_id = self.next_id.saturating_add(1);
        payload["id"] = Value::from(id);
        let mut encoded = serde_json::to_vec(&payload)
            .map_err(|e| format!("{} worker request encode failed: {e}", self.name))?;
        encoded.push(b'\n');
        self.stdin
            .write_all(&encoded)
            .await
            .map_err(|e| format!("{} worker write failed: {e}", self.name))?;
        self.stdin
            .flush()
            .await
            .map_err(|e| format!("{} worker flush failed: {e}", self.name))?;
        let response = self.read_response(timeout).await?;
        if response.id != Some(id) {
            return Err(format!(
                "{} worker response id mismatch expected={id} actual={:?}",
                self.name, response.id
            ));
        }
        if !response.ok {
            return Err(format!(
                "{} worker request failed: {}",
                self.name,
                response.error.as_deref().unwrap_or("unknown error")
            ));
        }
        Ok(response)
    }

    async fn read_response(&mut self, timeout: Duration) -> Result<WorkerResponse, String> {
        let mut line = String::new();
        let read = tokio::time::timeout(timeout, self.stdout.read_line(&mut line))
            .await
            .map_err(|_| format!("{} worker response timed out", self.name))?
            .map_err(|e| format!("{} worker read failed: {e}", self.name))?;
        if read == 0 {
            let status = self.child.try_wait().ok().flatten();
            return Err(format!(
                "{} worker exited unexpectedly status={status:?}",
                self.name
            ));
        }
        serde_json::from_str(&line)
            .map_err(|e| format!("{} worker returned invalid JSON: {e}", self.name))
    }
}

impl Drop for JsonLineWorker {
    fn drop(&mut self) {
        let _ = self.child.start_kill();
    }
}

#[cfg(test)]
mod tests {
    use super::WorkerResponse;

    #[test]
    fn worker_response_defaults_missing_kws_diagnostics() {
        let response: WorkerResponse =
            serde_json::from_str(r#"{"id":1,"ok":true,"keyword":""}"#).unwrap();
        assert!(response.tokens.is_empty());
        assert!(response.timestamps.is_empty());
        assert_eq!(response.candidate, "");
        assert_eq!(response.matched_tokens, 0);
        assert_eq!(response.total_tokens, 0);
        assert_eq!(response.token_progress, 0.0);
        assert_eq!(response.confidence_estimate, 0.0);
    }

    #[test]
    fn worker_response_deserializes_kws_diagnostics() {
        let response: WorkerResponse = serde_json::from_str(
            r#"{
                "id":2,
                "ok":true,
                "keyword":"HEY MARVII",
                "tokens":["▁HEY","▁MAR","VII"],
                "timestamps":[0.1,0.2,0.3],
                "candidate":"HEY MARVII",
                "matched_tokens":3,
                "total_tokens":3,
                "token_progress":1.0,
                "confidence_estimate":1.0
            }"#,
        )
        .unwrap();
        assert_eq!(response.tokens, vec!["▁HEY", "▁MAR", "VII"]);
        assert_eq!(response.timestamps, vec![0.1, 0.2, 0.3]);
        assert_eq!(response.candidate, "HEY MARVII");
        assert_eq!(response.matched_tokens, 3);
        assert_eq!(response.total_tokens, 3);
        assert_eq!(response.token_progress, 1.0);
        assert_eq!(response.confidence_estimate, 1.0);
    }
}

pub(crate) fn resolve_voice_python() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("OPENHUMAN_VOICE_PYTHON").map(PathBuf::from) {
        if path.is_file() {
            return Some(path);
        }
    }
    if let Some(path) = managed_voice_python() {
        return Some(path);
    }
    if let Some(pocket) = crate::openhuman::inference::paths::resolve_pockettts_binary() {
        if let Some(parent) = pocket.parent() {
            let python = parent.join(if cfg!(windows) {
                "python.exe"
            } else {
                "python"
            });
            if python.is_file() {
                return Some(python);
            }
        }
    }
    if cfg!(windows) {
        if let Some(local) = std::env::var_os("LOCALAPPDATA") {
            let legacy = PathBuf::from(local)
                .join("hermes")
                .join("hermes-agent")
                .join("venv")
                .join("Scripts")
                .join("python.exe");
            if legacy.is_file() {
                return Some(legacy);
            }
        }
    }
    find_on_path(if cfg!(windows) {
        "python.exe"
    } else {
        "python3"
    })
}

fn managed_voice_python() -> Option<PathBuf> {
    let root = crate::openhuman::config::default_root_openhuman_dir().ok()?;
    let path = root
        .join("bin")
        .join("voice-python")
        .join(if cfg!(windows) {
            PathBuf::from("Scripts").join("python.exe")
        } else {
            PathBuf::from("bin").join("python")
        });
    path.is_file().then_some(path)
}

fn find_on_path(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH").and_then(|path| {
        std::env::split_paths(&path)
            .map(|dir| dir.join(name))
            .find(|candidate| candidate.is_file())
    })
}

pub(crate) fn resolve_worker_script(name: &str) -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os("OPENHUMAN_VOICE_SCRIPTS_DIR").map(PathBuf::from) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    let source = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("scripts")
        .join("voice")
        .join(name);
    if source.is_file() {
        return Some(source);
    }
    let exe = std::env::current_exe().ok()?;
    let parent = exe.parent()?;
    [
        parent.join("scripts").join("voice").join(name),
        parent
            .join("_up_")
            .join("_up_")
            .join("scripts")
            .join("voice")
            .join(name),
        parent
            .join("resources")
            .join("_up_")
            .join("_up_")
            .join("scripts")
            .join("voice")
            .join(name),
        parent
            .parent()
            .unwrap_or(parent)
            .join("Resources")
            .join("_up_")
            .join("_up_")
            .join("scripts")
            .join("voice")
            .join(name),
    ]
    .into_iter()
    .find(|path| path.is_file())
}

pub(crate) fn find_kws_model_dir(config: &crate::openhuman::config::Config) -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("OPENHUMAN_SHERPA_KWS_MODEL_DIR").map(PathBuf::from) {
        if kws_assets_ok(&path) {
            return Some(path);
        }
    }
    let owned = crate::openhuman::inference::paths::shared_root_dir(config)
        .join("models")
        .join("local-ai")
        .join("kws")
        .join("sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01");
    if kws_assets_ok(&owned) {
        return Some(owned);
    }
    if cfg!(windows) {
        if let Some(local) = std::env::var_os("LOCALAPPDATA") {
            let legacy = PathBuf::from(local)
                .join("hermes")
                .join("cache")
                .join("sherpa-onnx")
                .join("kws-en-3.3m");
            if kws_assets_ok(&legacy) {
                log::info!("{LOG_PREFIX} using compatible legacy Sherpa KWS assets");
                return Some(legacy);
            }
        }
    }
    None
}

fn kws_assets_ok(path: &Path) -> bool {
    [
        "bpe.model",
        "tokens.txt",
        "encoder-epoch-12-avg-2-chunk-16-left-64.onnx",
        "decoder-epoch-12-avg-2-chunk-16-left-64.onnx",
        "joiner-epoch-12-avg-2-chunk-16-left-64.onnx",
    ]
    .iter()
    .all(|name| path.join(name).is_file())
}

pub(crate) fn voice_runtime_status(
    config: &crate::openhuman::config::Config,
) -> VoiceRuntimeStatus {
    if let Some(status) = SETUP_STATUS
        .lock()
        .expect("voice setup status lock poisoned")
        .clone()
    {
        if status.state == "installing" || status.state == "error" {
            return status;
        }
    }
    detected_runtime_status(config)
}

fn detected_runtime_status(config: &crate::openhuman::config::Config) -> VoiceRuntimeStatus {
    let python = managed_voice_python();
    let model = find_kws_model_dir(config);
    VoiceRuntimeStatus {
        state: if python.is_some() && model.is_some() {
            "installed"
        } else {
            "missing"
        }
        .to_string(),
        stage: None,
        error_detail: None,
        python_path: python.map(|path| path.to_string_lossy().to_string()),
        kws_model_path: model.map(|path| path.to_string_lossy().to_string()),
    }
}

pub(crate) fn begin_voice_runtime_setup(
    config: crate::openhuman::config::Config,
) -> VoiceRuntimeStatus {
    let installing = VoiceRuntimeStatus {
        state: "installing".to_string(),
        stage: Some("installing Python packages and Sherpa model".to_string()),
        error_detail: None,
        python_path: None,
        kws_model_path: None,
    };
    {
        let mut status = SETUP_STATUS
            .lock()
            .expect("voice setup status lock poisoned");
        if status
            .as_ref()
            .is_some_and(|value| value.state == "installing")
        {
            return status.clone().expect("checked above");
        }
        *status = Some(installing.clone());
    }
    tokio::spawn(async move {
        let result = run_voice_runtime_setup(&config).await;
        let next = match result {
            Ok(()) => detected_runtime_status(&config),
            Err(error) => VoiceRuntimeStatus {
                state: "error".to_string(),
                stage: Some("voice runtime setup failed".to_string()),
                error_detail: Some(error),
                python_path: None,
                kws_model_path: None,
            },
        };
        *SETUP_STATUS
            .lock()
            .expect("voice setup status lock poisoned") = Some(next);
    });
    installing
}

async fn run_voice_runtime_setup(config: &crate::openhuman::config::Config) -> Result<(), String> {
    let bootstrap = resolve_voice_python()
        .or_else(|| find_on_path(if cfg!(windows) { "py.exe" } else { "python3" }))
        .ok_or_else(|| "Python 3 is required to install local voice workers".to_string())?;
    let script = resolve_worker_script("install_voice_runtime.py")
        .ok_or_else(|| "voice runtime installer script not found".to_string())?;
    let root = crate::openhuman::inference::paths::shared_root_dir(config);
    log::info!(
        "{LOG_PREFIX} setup=start bootstrap={} root={}",
        bootstrap.display(),
        root.display()
    );
    let output = Command::new(bootstrap)
        .arg(script)
        .arg("--root")
        .arg(root)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("failed to launch voice runtime setup: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "voice runtime setup failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    log::info!("{LOG_PREFIX} setup=complete");
    Ok(())
}
