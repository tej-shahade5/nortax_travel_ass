"""Policy constants and business rules from expense_policy.md"""

# City tier definitions
TIER_1_CITIES = [
    "Bengaluru", "Mumbai", "Delhi NCR", "Delhi", "NCR",
    "Hyderabad", "Chennai", "Pune", "Kolkata"
]

TIER_2_CITIES = [
    "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur",
    "Indore", "Bhopal", "Patna", "Vadodara", "Surat",
    "Rajkot", "Coimbatore", "Kochi", "Visakhapatnam"
]

# Lodging limits per night (room tariff, taxes separate)
LODGING_LIMITS = {
    "Tier 1": 6000,
    "Tier 2": 4000,
    "Tier 3": 2800,
}

# Meal limits per full day
MEAL_LIMITS = {
    "Tier 1": 1500,
    "Tier 2": 1000,
    "Tier 3": 1000,
}

# Minimum bill amount for meal claims (requires bill above this)
MEAL_BILL_THRESHOLD = 500

# Approval matrix: (max_amount, required_approver_levels)
# Level 1 = Reporting Manager
# Level 2 = Head of Department
# Level 3 = Head of Division
# Level 4 = MD/CEO
APPROVAL_MATRIX = [
    (25000, [1]),           # Up to 25,000
    (75000, [1, 2]),        # 25,001 - 75,000
    (200000, [1, 2, 3]),    # 75,001 - 2,00,000
    (float('inf'), [1, 2, 3, 4]),  # Above 2,00,000
]

# Business entertainment requires HOD approval if above this amount
BUSINESS_ENTERTAINMENT_HOD_THRESHOLD = 2000

# Non-reimbursable items (to flag in hotel folios)
NON_REIMBURSABLE_ITEMS = [
    "laundry", "mini bar", "minibar", "in-room entertainment",
    "spa", "gym", "personal phone", "personal data",
    "alcohol", "fine", "penalty", "traffic challan",
    "travel insurance", "independent travel insurance",
]

# Claim submission deadline (days after return)
CLAIM_SUBMISSION_DEADLINE_DAYS = 7

# Payment run dates
PAYMENT_RUN_DAYS = [10, 25]

# Advance percentage limit
ADVANCE_MAX_PERCENTAGE = 60


def get_city_tier(city: str) -> str:
    """Determine city tier based on city name."""
    city_lower = city.lower()
    for tier1 in TIER_1_CITIES:
        if tier1.lower() in city_lower:
            return "Tier 1"
    for tier2 in TIER_2_CITIES:
        if tier2.lower() in city_lower:
            return "Tier 2"
    return "Tier 3"


def get_required_approval_levels(amount: float) -> list[int]:
    """Get required approval levels based on claim amount."""
    for max_amount, levels in APPROVAL_MATRIX:
        if amount <= max_amount:
            return levels
    return [1, 2, 3, 4]  # Default to all levels
