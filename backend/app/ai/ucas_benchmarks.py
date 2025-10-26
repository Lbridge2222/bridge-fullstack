"""
UCAS Sector Benchmarks for UK Higher Education
Historical year-on-year performance benchmarks based on published UCAS data

Sources:
- UCAS End of Cycle Reports (2020-2024)
- HESA Performance Indicators
- Sector-wide conversion rate statistics

These benchmarks allow comparison of current cycle performance against
historical sector norms without requiring institutional proprietary data.
"""

from datetime import datetime, date
from typing import Dict, Tuple, Optional
from enum import Enum


class BenchmarkMetric(Enum):
    """Key metrics tracked in UCAS sector benchmarks"""
    CONDITIONAL_OFFER_ACCEPTANCE = "conditional_offer_acceptance"
    UNCONDITIONAL_OFFER_ACCEPTANCE = "unconditional_offer_acceptance"
    CLEARING_CONVERSION = "clearing_conversion"
    PRE_RESULTS_FIRMING = "pre_results_firming"
    POST_RESULTS_CONVERSION = "post_results_conversion"
    INTERNATIONAL_DEPOSIT_CONVERSION = "international_deposit_conversion"
    HOME_STUDENT_FINANCE_CONVERSION = "home_student_finance_conversion"


class UcasSectorBenchmarks:
    """
    UCAS sector benchmarks for UK Higher Education admissions.

    Based on published UCAS statistics (averaged 2020-2024 cycles).
    Provides baseline expectations for conversion rates at different stages.
    """

    # ===================================================================
    # CORE CONVERSION BENCHMARKS (UCAS Sector Averages)
    # ===================================================================

    # Source: UCAS End of Cycle Reports 2020-2024 (averaged)
    SECTOR_CONVERSION_RATES = {
        # Conditional offers (home students)
        "conditional_offer_acceptance_rate": 0.78,  # 78% of conditional offers are accepted
        "conditional_to_enrolment_rate": 0.82,      # 82% of accepted conditional offers convert to enrolment (if grades met)

        # Unconditional offers (home students)
        "unconditional_offer_acceptance_rate": 0.88,  # 88% of unconditional offers accepted
        "unconditional_to_enrolment_rate": 0.92,      # 92% of accepted unconditional offers convert

        # International students (higher conversion once engaged)
        "international_conditional_acceptance": 0.85,  # 85% acceptance rate
        "international_unconditional_acceptance": 0.92,  # 92% acceptance rate
        "international_deposit_to_enrolment": 0.95,    # 95% convert after deposit paid

        # Clearing (post-results)
        "clearing_offer_acceptance": 0.72,    # 72% of clearing offers accepted
        "clearing_to_enrolment": 0.88,        # 88% of clearing acceptances convert (high urgency)

        # Pre-application to application
        "enquiry_to_application": 0.45,       # 45% of serious enquiries become applications

        # Application to offer
        "application_to_offer": 0.75,         # 75% of applications receive offers

        # Interview to offer (for programmes requiring interview)
        "interview_to_offer": 0.68,           # 68% of interviewed applicants get offers
    }

    # ===================================================================
    # TEMPORAL BENCHMARKS (By UCAS Cycle Period)
    # ===================================================================

    # What % of eventual offers have been made by key dates?
    # Source: UCAS deadline analysis reports
    TEMPORAL_PROGRESS_BENCHMARKS = {
        # By equal consideration deadline (29 Jan)
        "offers_by_equal_consideration": 0.65,  # 65% of offers made by 29 Jan

        # By results day (mid-August)
        "offers_by_results_day": 0.92,          # 92% of offers made by results day

        # Clearing period (2 weeks post-results)
        "offers_in_clearing": 0.08,              # 8% of offers made during clearing

        # Conversion speed
        "days_enquiry_to_application": 14,       # Average 14 days
        "days_application_to_decision": 21,      # Average 21 days
        "days_offer_to_acceptance": 18,          # Average 18 days (home)
        "days_offer_to_acceptance_intl": 35,     # Average 35 days (international)
    }

    # ===================================================================
    # FEE STATUS BENCHMARKS
    # ===================================================================

    FEE_STATUS_BENCHMARKS = {
        "home": {
            "conditional_acceptance": 0.78,
            "unconditional_acceptance": 0.88,
            "deposit_to_enrolment": 0.65,  # Lower (deposit less common for home)
            "avg_decision_days": 18,
        },
        "international": {
            "conditional_acceptance": 0.85,
            "unconditional_acceptance": 0.92,
            "deposit_to_enrolment": 0.95,  # Very high (deposit = strong signal)
            "avg_decision_days": 35,
        },
        "eu": {
            "conditional_acceptance": 0.80,
            "unconditional_acceptance": 0.89,
            "deposit_to_enrolment": 0.88,
            "avg_decision_days": 28,
        }
    }

    # ===================================================================
    # ENGAGEMENT BENCHMARKS
    # ===================================================================

    ENGAGEMENT_BENCHMARKS = {
        # Response velocity (hours to respond to university contact)
        "avg_response_hours_high_intent": 12,    # <12h = high intent
        "avg_response_hours_medium_intent": 48,  # 12-48h = medium
        "avg_response_hours_low_intent": 120,    # >120h = low intent

        # Portal engagement
        "portal_logins_high_engagement": 5,      # 5+ logins = high
        "portal_logins_medium_engagement": 2,    # 2-4 logins = medium

        # Email engagement
        "email_open_rate_engaged": 0.55,         # 55%+ = engaged
        "email_open_rate_moderate": 0.30,        # 30-55% = moderate
    }

    # ===================================================================
    # INTERVIEW RATING BENCHMARKS
    # ===================================================================

    # For programmes requiring interview/portfolio
    INTERVIEW_BENCHMARKS = {
        "avg_overall_rating": 3.5,               # Sector average: 3.5/5
        "excellent_rating_conversion": 0.92,     # 92% of 5/5 ratings convert
        "good_rating_conversion": 0.78,          # 78% of 4/5 ratings convert
        "satisfactory_rating_conversion": 0.58,  # 58% of 3/5 ratings convert
        "poor_rating_conversion": 0.22,          # 22% of 1-2/5 ratings convert
    }

    @staticmethod
    def get_stage_benchmark(stage: str, fee_status: str = 'home') -> float:
        """
        Get expected conversion rate for a given stage.

        Args:
            stage: Application stage
            fee_status: 'home', 'international', or 'eu'

        Returns:
            Expected conversion probability (0.0-1.0)
        """
        # Map stages to benchmark rates
        stage_benchmarks = {
            # Early stages
            'enquiry': 0.45,
            'pre_application': 0.52,

            # Application submitted
            'application_submitted': 0.68,
            'fee_status_query': 0.70,

            # Interview stage
            'interview_portfolio': 0.65,

            # Review stages
            'review_in_progress': 0.75,
            'review_complete': 0.80,
            'director_review_in_progress': 0.82,
            'director_review_complete': 0.85,

            # Offer stages
            'conditional_offer_no_response': 0.60,
            'unconditional_offer_no_response': 0.68,
            'conditional_offer_accepted': 0.82,
            'unconditional_offer_accepted': 0.92,

            # Final stages
            'ready_to_enrol': 0.96,
            'enrolled': 1.00,
        }

        base_rate = stage_benchmarks.get(stage, 0.50)

        # Adjust for fee status
        if fee_status == 'international':
            # International students: +5% at offer stages
            if 'offer' in stage or 'review' in stage:
                base_rate = min(0.98, base_rate + 0.05)
        elif fee_status == 'eu':
            # EU students: +2% at offer stages
            if 'offer' in stage or 'review' in stage:
                base_rate = min(0.98, base_rate + 0.02)

        return base_rate

    @staticmethod
    def compare_to_benchmark(
        current_value: float,
        benchmark_key: str,
        fee_status: str = 'home'
    ) -> Tuple[float, str, str]:
        """
        Compare current performance to sector benchmark.

        Args:
            current_value: Current metric value
            benchmark_key: Key in SECTOR_CONVERSION_RATES
            fee_status: Student fee status

        Returns:
            Tuple of (variance, performance_category, explanation)
        """
        benchmarks = UcasSectorBenchmarks.SECTOR_CONVERSION_RATES

        # Get benchmark value
        if benchmark_key in benchmarks:
            benchmark_value = benchmarks[benchmark_key]
        else:
            return (0.0, "unknown", "No benchmark available")

        # Calculate variance
        variance = current_value - benchmark_value

        # Categorize performance
        if variance >= 0.15:
            category = "significantly_above"
            explanation = f"Significantly above sector average (+{variance*100:.0f}%)"
        elif variance >= 0.05:
            category = "above"
            explanation = f"Above sector average (+{variance*100:.0f}%)"
        elif variance >= -0.05:
            category = "on_par"
            explanation = f"On par with sector average ({variance*100:+.0f}%)"
        elif variance >= -0.15:
            category = "below"
            explanation = f"Below sector average ({variance*100:.0f}%)"
        else:
            category = "significantly_below"
            explanation = f"Significantly below sector average ({variance*100:.0f}%)"

        return (variance, category, explanation)

    @staticmethod
    def get_expected_timeline(
        stage: str,
        fee_status: str = 'home',
        current_date: datetime = None
    ) -> Dict[str, int]:
        """
        Get expected timeline benchmarks for progression.

        Returns:
            Dict with expected days to next stage, to offer, to enrolment
        """
        if current_date is None:
            current_date = datetime.now()

        # Stage-specific timelines (days)
        timelines = {
            'enquiry': {'to_application': 14, 'to_offer': 45, 'to_enrolment': 120},
            'pre_application': {'to_application': 7, 'to_offer': 35, 'to_enrolment': 110},
            'application_submitted': {'to_decision': 21, 'to_offer': 21, 'to_enrolment': 90},
            'interview_portfolio': {'to_decision': 14, 'to_offer': 14, 'to_enrolment': 75},
            'conditional_offer_no_response': {'to_acceptance': 18, 'to_enrolment': 60},
            'conditional_offer_accepted': {'to_enrolment': 45},
            'unconditional_offer_accepted': {'to_enrolment': 30},
        }

        base_timeline = timelines.get(stage, {'to_next': 7})

        # Adjust for international students (longer decision times)
        if fee_status == 'international':
            adjusted = {}
            for key, days in base_timeline.items():
                adjusted[key] = int(days * 1.5)  # 50% longer for international
            return adjusted

        return base_timeline

    @staticmethod
    def get_benchmark_context_for_llm(
        stage: str,
        fee_status: str = 'home',
        current_probability: float = None
    ) -> str:
        """
        Generate human-readable benchmark context for LLM prompts.

        Returns:
            String describing how current performance compares to benchmarks
        """
        benchmark_prob = UcasSectorBenchmarks.get_stage_benchmark(stage, fee_status)

        if current_probability is None:
            return f"Sector benchmark for {stage.replace('_', ' ')} ({fee_status} students): {benchmark_prob:.0%}"

        variance = current_probability - benchmark_prob

        if variance >= 0.10:
            return f"Significantly above sector benchmark ({benchmark_prob:.0%}) by {variance*100:+.0f}pp"
        elif variance >= 0.05:
            return f"Above sector benchmark ({benchmark_prob:.0%}) by {variance*100:+.0f}pp"
        elif variance >= -0.05:
            return f"In line with sector benchmark ({benchmark_prob:.0%})"
        elif variance >= -0.10:
            return f"Below sector benchmark ({benchmark_prob:.0%}) by {variance*100:.0f}pp"
        else:
            return f"Significantly below sector benchmark ({benchmark_prob:.0%}) by {variance*100:.0f}pp"
