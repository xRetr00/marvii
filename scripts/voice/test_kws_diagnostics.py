import unittest

from kws_diagnostics import KeywordVariant, build_diagnostics, diagnostic_response


class KwsDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.variants = [
            KeywordVariant("HEY MARVII", ("▁HEY", "▁MAR", "VII")),
            KeywordVariant("MARVI", ("▁MAR", "VI")),
            KeywordVariant("HEY MARVY", ("▁HEY", "▁MAR", "VY")),
        ]

    def test_exact_candidate_reports_full_progress(self):
        result = build_diagnostics(["▁HEY", "▁MAR", "VII"], self.variants)
        self.assertEqual(result["candidate"], "HEY MARVII")
        self.assertEqual(result["matched_tokens"], 3)
        self.assertEqual(result["total_tokens"], 3)
        self.assertEqual(result["token_progress"], 1.0)
        self.assertEqual(result["confidence_estimate"], 1.0)

    def test_partial_tokens_select_best_prefix_candidate(self):
        result = build_diagnostics(["▁HEY", "▁MAR"], self.variants)
        self.assertEqual(result["candidate"], "HEY MARVII")
        self.assertEqual(result["matched_tokens"], 2)
        self.assertEqual(result["total_tokens"], 3)
        self.assertAlmostEqual(result["token_progress"], 2 / 3)

    def test_empty_tokens_return_zero_diagnostics(self):
        result = build_diagnostics([], self.variants)
        self.assertEqual(
            result,
            {
                "candidate": "",
                "matched_tokens": 0,
                "total_tokens": 0,
                "token_progress": 0.0,
                "confidence_estimate": 0.0,
            },
        )

    def test_tie_prefers_more_matches_then_shorter_candidate(self):
        variants = [
            KeywordVariant("LONG", ("A", "B", "C", "D")),
            KeywordVariant("SHORT", ("A", "B", "C")),
            KeywordVariant("ONE", ("A",)),
        ]
        result = build_diagnostics(["A", "B"], variants)
        self.assertEqual(result["candidate"], "SHORT")
        self.assertEqual(result["matched_tokens"], 2)
        self.assertEqual(result["total_tokens"], 3)

    def test_non_prefix_tokens_do_not_claim_progress(self):
        result = build_diagnostics(["NOISE", "▁MAR"], self.variants)
        self.assertEqual(result["candidate"], "")
        self.assertEqual(result["matched_tokens"], 0)
        self.assertEqual(result["confidence_estimate"], 0.0)

    def test_sherpa_display_tokens_match_sentencepiece_tokens(self):
        variants = [
            KeywordVariant(
                "AFTER EARLY NIGHTFALL",
                ("▁AFTER", "▁E", "AR", "LY", "▁", "N", "IGHT", "F", "AL", "L"),
            )
        ]
        result = build_diagnostics(
            [" AFTER", " E", "AR", "LY", " ", "N", "IGHT", "F", "AL", "L"],
            variants,
        )
        self.assertEqual(result["candidate"], "AFTER EARLY NIGHTFALL")
        self.assertEqual(result["matched_tokens"], 10)
        self.assertEqual(result["token_progress"], 1.0)

    def test_response_contains_exact_sherpa_and_derived_fields(self):
        result = diagnostic_response(
            request_id=7,
            keyword="HEY MARVII",
            tokens=["▁HEY", "▁MAR", "VII"],
            timestamps=[0.1, 0.2, 0.3],
            variants=self.variants,
        )
        self.assertEqual(result["id"], 7)
        self.assertTrue(result["ok"])
        self.assertEqual(result["keyword"], "HEY MARVII")
        self.assertEqual(result["tokens"], ["▁HEY", "▁MAR", "VII"])
        self.assertEqual(result["timestamps"], [0.1, 0.2, 0.3])
        self.assertEqual(result["candidate"], "HEY MARVII")
        self.assertEqual(result["matched_tokens"], 3)
        self.assertEqual(result["confidence_estimate"], 1.0)


if __name__ == "__main__":
    unittest.main()
