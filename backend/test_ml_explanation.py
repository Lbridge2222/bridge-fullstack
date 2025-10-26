"""Test ML explanation generation with UCAS temporal awareness"""
import asyncio
from datetime import datetime
from app.ai.application_ml import extract_application_features, predict_stage_progression
from app.ai.ucas_cycle import UcasCycleCalendar

async def test():
    # Jack Scott's application ID
    app_id = "550e8400-e29b-41d4-a716-446655441040"

    print(f"Testing ML explanation for application: {app_id}")
    print("=" * 60)

    # Show current UCAS cycle context
    print("\nUCAS Cycle Context:")
    print("-" * 60)
    period, context = UcasCycleCalendar.get_current_period()
    print(f"Current Period: {period.name} ({period.value})")
    print(f"Cycle Year: {context['cycle_year']}")
    print(f"Days to Equal Consideration: {context['days_to_equal_consideration']}")
    print(f"Days to Results: {context['days_to_results']}")
    print(f"Days to Decline by Default: {context['days_to_decline_by_default']}")
    print(f"Context: {UcasCycleCalendar.get_ucas_context_for_llm()}")
    print("=" * 60)

    try:
        print("\n1. Extracting features...")
        features = await extract_application_features(app_id)
        print(f"✓ Features extracted: {len(features)} fields")
        print(f"  - Stage: {features.get('stage')}")
        print(f"  - Person ID: {features.get('person_id')}")
        print(f"  - UCAS Period: {features.get('ucas_period')}")
        print(f"  - UCAS Temporal Adjustment: {features.get('ucas_temporal_adjustment')}")
        print(f"  - UCAS Temporal Reason: {features.get('ucas_temporal_reason')}")

        print("\n2. Generating prediction...")
        prediction = predict_stage_progression(features)
        print(f"✓ Prediction generated")
        print(f"  - Next stage: {prediction.next_stage}")
        print(f"  - Progression probability: {prediction.progression_probability}")
        print(f"  - Confidence: {prediction.confidence}")
        print(f"  - Adjustment factors: {len(prediction.adjustment_factors)} factors")

        print("\n3. Explanation:")
        print("-" * 60)
        if prediction.explanation:
            print(prediction.explanation)
        else:
            print("NO EXPLANATION GENERATED")
        print("-" * 60)

        if prediction.adjustment_factors:
            print("\n4. Top adjustment factors:")
            for i, factor in enumerate(prediction.adjustment_factors[:5], 1):
                print(f"   {i}. {factor['reason']} ({factor['weight']:+.2f})")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
