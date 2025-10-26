"""
UCAS Cycle Calendar and Temporal Awareness
UK Higher Education admissions cycle dates and scoring adjustments
"""

from datetime import datetime, date
from typing import Dict, Tuple, Optional
from enum import Enum


class UcasPeriod(Enum):
    """Key periods in the UCAS admissions cycle"""
    EARLY_CYCLE = "early_cycle"  # September - December
    EQUAL_CONSIDERATION = "equal_consideration"  # Before 29 Jan
    POST_JANUARY = "post_january"  # 30 Jan - May
    PRE_RESULTS = "pre_results"  # June - Mid August
    RESULTS_WEEK = "results_week"  # A-level results week (mid-August)
    CLEARING = "clearing"  # Post-results to September
    LATE_CLEARING = "late_clearing"  # September onwards
    POST_CYCLE = "post_cycle"  # After 1 September


class UcasCycleCalendar:
    """
    UCAS cycle calendar for UK Higher Education admissions.

    Key dates based on standard UCAS timeline:
    - Equal Consideration Deadline: 29 January
    - A-level Results Day: ~18 August (Thursday of 3rd week)
    - Clearing Opens: Results day
    - Decline by Default: 1 September
    """

    @staticmethod
    def get_cycle_year(current_date: datetime = None) -> int:
        """
        Get the UCAS cycle year (entry year for students).
        UCAS cycle runs September-September for the NEXT academic year.

        Example: September 2024 - August 2025 is the 2025 entry cycle.
        """
        if current_date is None:
            current_date = datetime.now()

        # If we're in September-December, it's the next year's cycle
        if current_date.month >= 9:
            return current_date.year + 1
        # If we're in January-August, it's this year's cycle
        else:
            return current_date.year

    @staticmethod
    def get_key_dates(cycle_year: int) -> Dict[str, date]:
        """
        Get key UCAS dates for a given cycle year.

        Args:
            cycle_year: The entry year (e.g., 2025 for 2025 entry)

        Returns:
            Dictionary of key dates for the cycle
        """
        prev_year = cycle_year - 1

        # A-level results day: 3rd Thursday of August
        results_day = UcasCycleCalendar._calculate_results_day(cycle_year)

        return {
            # Application period dates
            "cycle_opens": date(prev_year, 9, 1),  # 1 September
            "equal_consideration_deadline": date(cycle_year, 1, 29),  # 29 January
            "main_deadline": date(cycle_year, 1, 29),  # Same as equal consideration

            # Results and clearing
            "results_day": results_day,
            "clearing_opens": results_day,  # Same day as results
            "clearing_plus_deadline": date(cycle_year, 7, 4),  # 4 July for Clearing Plus

            # Final deadlines
            "decline_by_default": date(cycle_year, 9, 1),  # 1 September
            "cycle_closes": date(cycle_year, 10, 31),  # 31 October

            # Term start (typical UK HE)
            "typical_term_start": date(cycle_year, 9, 15),  # Mid-September
        }

    @staticmethod
    def _calculate_results_day(year: int) -> date:
        """
        Calculate A-level results day (3rd Thursday of August).

        Args:
            year: The entry year

        Returns:
            Date of A-level results day
        """
        # Start from August 1st
        august_first = date(year, 8, 1)

        # Find first Thursday
        days_until_thursday = (3 - august_first.weekday()) % 7
        if days_until_thursday == 0 and august_first.weekday() != 3:
            days_until_thursday = 7
        first_thursday = date(year, 8, 1 + days_until_thursday)

        # Add 2 weeks to get 3rd Thursday
        results_day = date(year, 8, first_thursday.day + 14)

        return results_day

    @staticmethod
    def get_current_period(current_date: datetime = None) -> Tuple[UcasPeriod, Dict[str, any]]:
        """
        Determine which period of the UCAS cycle we're currently in.

        Returns:
            Tuple of (period, context_dict with relevant dates and info)
        """
        if current_date is None:
            current_date = datetime.now()

        cycle_year = UcasCycleCalendar.get_cycle_year(current_date)
        key_dates = UcasCycleCalendar.get_key_dates(cycle_year)

        current = current_date.date()

        # Build context
        context = {
            "cycle_year": cycle_year,
            "key_dates": key_dates,
            "days_to_equal_consideration": (key_dates["equal_consideration_deadline"] - current).days,
            "days_to_results": (key_dates["results_day"] - current).days,
            "days_to_decline_by_default": (key_dates["decline_by_default"] - current).days,
        }

        # Determine period
        if current >= key_dates["decline_by_default"]:
            if current >= key_dates["cycle_closes"]:
                period = UcasPeriod.POST_CYCLE
            else:
                period = UcasPeriod.LATE_CLEARING

        elif current >= key_dates["results_day"]:
            # In clearing period
            days_since_results = (current - key_dates["results_day"]).days
            if days_since_results <= 14:  # First 2 weeks is peak clearing
                period = UcasPeriod.CLEARING
            else:
                period = UcasPeriod.LATE_CLEARING

        elif current >= date(current_date.year, 6, 1):
            # June onwards but before results
            period = UcasPeriod.PRE_RESULTS

        elif current >= key_dates["equal_consideration_deadline"]:
            # After January deadline
            period = UcasPeriod.POST_JANUARY

        elif current >= date(current_date.year, 1, 1):
            # January, before deadline
            period = UcasPeriod.EQUAL_CONSIDERATION

        else:
            # September - December
            period = UcasPeriod.EARLY_CYCLE

        context["period"] = period.value
        context["period_name"] = period.name

        return period, context

    @staticmethod
    def get_temporal_adjustment(
        application_stage: str,
        application_created_date: datetime,
        current_date: datetime = None
    ) -> Tuple[float, str]:
        """
        Calculate temporal adjustment based on UCAS cycle position.

        This is CRITICAL for UK HE - timing matters enormously:
        - Applications before equal consideration deadline: higher conversion
        - Applications during clearing: faster conversion but lower yield
        - Late applications: significantly lower conversion

        Args:
            application_stage: Current application stage
            application_created_date: When application was created
            current_date: Current date (defaults to now)

        Returns:
            Tuple of (adjustment_weight, reason)
        """
        if current_date is None:
            current_date = datetime.now()

        period, context = UcasCycleCalendar.get_current_period(current_date)
        cycle_year = context["cycle_year"]
        key_dates = context["key_dates"]

        # Check when application was created relative to key dates
        app_date = application_created_date.date() if isinstance(application_created_date, datetime) else application_created_date

        # === TIMING OF APPLICATION SUBMISSION ===

        # Applied before equal consideration deadline - strong positive
        if app_date <= key_dates["equal_consideration_deadline"]:
            if period in [UcasPeriod.EARLY_CYCLE, UcasPeriod.EQUAL_CONSIDERATION]:
                return (0.15, "Application submitted before equal consideration deadline - strong commitment")
            else:
                return (0.10, "Application submitted early in cycle (before January deadline)")

        # Applied during clearing - mixed signal
        if key_dates["results_day"] <= app_date <= key_dates["decline_by_default"]:
            if application_stage in ["enquiry", "pre_application"]:
                return (0.20, "Clearing applicant - high urgency, fast conversion expected")
            elif application_stage in ["conditional_offer_accepted", "unconditional_offer_accepted"]:
                return (0.15, "Clearing offer accepted - strong signal")
            else:
                return (0.05, "Clearing period application")

        # Applied after decline by default - late application, weaker
        if app_date > key_dates["decline_by_default"]:
            return (-0.15, "Late application (after decline by default date) - lower conversion likelihood")

        # === CURRENT PERIOD ADJUSTMENTS ===

        # Currently in clearing - time pressure benefits offers
        if period == UcasPeriod.CLEARING:
            if application_stage in ["conditional_offer_no_response", "unconditional_offer_no_response"]:
                return (0.15, "Clearing period - offer urgency heightened")
            elif application_stage in ["conditional_offer_accepted", "unconditional_offer_accepted"]:
                return (0.20, "Clearing period acceptance - high conversion likelihood")

        # Approaching results day with conditional offer
        if period == UcasPeriod.PRE_RESULTS:
            days_to_results = context["days_to_results"]
            if application_stage in ["conditional_offer_accepted", "conditional_offer_no_response"]:
                if days_to_results <= 30:
                    return (0.10, f"Results day in {days_to_results} days - conditional offer tension rising")

        # Approaching equal consideration deadline
        if period == UcasPeriod.EQUAL_CONSIDERATION:
            days_left = context["days_to_equal_consideration"]
            if days_left <= 7 and application_stage in ["enquiry", "pre_application"]:
                return (0.12, f"Equal consideration deadline in {days_left} days - urgency benefit")

        # Approaching decline by default
        if period in [UcasPeriod.CLEARING, UcasPeriod.LATE_CLEARING]:
            days_left = context["days_to_decline_by_default"]
            if days_left <= 14 and application_stage in ["conditional_offer_accepted", "unconditional_offer_accepted"]:
                return (0.15, f"Decline by default in {days_left} days - strong commitment signal")

        # Post-cycle applications are very weak
        if period == UcasPeriod.POST_CYCLE:
            return (-0.25, "Post-cycle application - significantly lower conversion")

        # Default: no temporal adjustment
        return (0.0, "Standard cycle timing")

    @staticmethod
    def get_ucas_context_for_llm(current_date: datetime = None) -> str:
        """
        Generate human-readable UCAS cycle context for LLM prompts.

        Returns:
            String describing current UCAS cycle position and what it means
        """
        period, context = UcasCycleCalendar.get_current_period(current_date)

        if period == UcasPeriod.EARLY_CYCLE:
            return "Early UCAS cycle (Sep-Dec). Peak application period. Strong applications now indicate serious intent."

        elif period == UcasPeriod.EQUAL_CONSIDERATION:
            days_left = context["days_to_equal_consideration"]
            return f"Approaching equal consideration deadline ({days_left} days). Applications before 29 Jan receive equal consideration."

        elif period == UcasPeriod.POST_JANUARY:
            return "Post-January deadline. Applications still processed but outside equal consideration period."

        elif period == UcasPeriod.PRE_RESULTS:
            days_to_results = context["days_to_results"]
            return f"Pre-results period. A-level results in {days_to_results} days. Conditional offer holders awaiting grades."

        elif period == UcasPeriod.RESULTS_WEEK:
            return "**A-LEVEL RESULTS WEEK**. Peak conversion period. Conditional offers converting to firm. Clearing beginning."

        elif period == UcasPeriod.CLEARING:
            days_to_dbd = context["days_to_decline_by_default"]
            return f"**CLEARING PERIOD**. Fast-moving market. Decline by default in {days_to_dbd} days. Urgent conversion window."

        elif period == UcasPeriod.LATE_CLEARING:
            return "Late clearing. Approaching decline by default (1 Sep). Final conversion opportunities."

        elif period == UcasPeriod.POST_CYCLE:
            return "Post-cycle period. Very low conversion likelihood. Consider deferrals to next cycle."

        return "Standard UCAS cycle period."
