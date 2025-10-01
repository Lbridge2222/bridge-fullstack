"""
Unit tests for contract enforcement functionality.
"""

import pytest
from unittest.mock import Mock, patch
from app.ai.contract_enforcer import enforce_contract, clear_contract_cache
from app.ai.ui_models import ContentContract


class TestContractEnforcement:
    """Test contract enforcement functionality."""
    
    def setup_method(self):
        """Clear cache before each test."""
        clear_contract_cache()
    
    def test_enforce_contract_with_no_contract(self):
        """Test that enforce_contract returns original text when no contract provided."""
        text = "This is a test response."
        result = enforce_contract(text, None)
        assert result == text
    
    def test_enforce_contract_with_empty_contract(self):
        """Test that enforce_contract returns original text when contract is empty."""
        text = "This is a test response."
        contract = ContentContract(mode="general", course=None, must=[])
        result = enforce_contract(text, contract)
        assert result == text
    
    @patch('app.ai.contract_enforcer.rewrite_answer')
    def test_enforce_contract_calls_rewriter(self, mock_rewrite):
        """Test that enforce_contract calls rewrite_answer with correct parameters."""
        text = "This is a test response."
        contract = ContentContract(mode="policy", course="Test Course", must=["reasonable_length"])
        mock_rewrite.return_value = "Rewritten response."
        
        result = enforce_contract(text, contract)
        
        mock_rewrite.assert_called_once_with(text, contract)
        assert result == "Rewritten response."
    
    @patch('app.ai.contract_enforcer.rewrite_answer')
    def test_enforce_contract_handles_rewrite_exception(self, mock_rewrite):
        """Test that enforce_contract handles rewrite exceptions gracefully."""
        text = "This is a test response."
        contract = ContentContract(mode="policy", course="Test Course", must=["reasonable_length"])
        mock_rewrite.side_effect = Exception("Rewrite failed")
        
        # Should not raise exception, should return original text
        result = enforce_contract(text, contract)
        assert result == text
    
    def test_enforce_contract_with_context(self):
        """Test that enforce_contract accepts context parameter."""
        text = "This is a test response."
        contract = ContentContract(mode="policy", course="Test Course", must=["reasonable_length"])
        context = {"name": "Test User"}
        
        # Should not raise exception with context parameter
        result = enforce_contract(text, contract, context)
        assert result is not None


class TestContractRequirements:
    """Test specific contract requirements."""
    
    @patch('app.ai.contract_enforcer.rewrite_answer')
    def test_policy_contract_with_bullets_requirement(self, mock_rewrite):
        """Test that policy contracts with bullet requirements are processed."""
        text = "This is a policy response."
        contract = ContentContract(
            mode="policy", 
            course="BA (Hons) Music Production", 
            must=[">=3_bullets", "reasonable_length"]
        )
        mock_rewrite.return_value = "• Point 1\n• Point 2\n• Point 3"
        
        result = enforce_contract(text, contract)
        
        mock_rewrite.assert_called_once_with(text, contract)
        assert result == "• Point 1\n• Point 2\n• Point 3"
    
    @patch('app.ai.contract_enforcer.rewrite_answer')
    def test_apel_contract_with_definition_requirement(self, mock_rewrite):
        """Test that APEL contracts with definition requirements are processed."""
        text = "APEL information."
        contract = ContentContract(
            mode="apel",
            course="BA (Hons) Music Production",
            must=["apel_definition_strict", "short_intro<=25w"]
        )
        mock_rewrite.return_value = "APEL (Accreditation of Prior Experiential Learning) allows..."
        
        result = enforce_contract(text, contract)
        
        mock_rewrite.assert_called_once_with(text, contract)
        assert "APEL" in result


class TestContractIntegration:
    """Test contract enforcement integration scenarios."""
    
    def test_enforce_contract_with_different_modes(self):
        """Test contract enforcement with different contract modes."""
        modes = ["policy", "apel", "guidance", "nba", "admissions", "general"]
        
        for mode in modes:
            text = f"Test response for {mode} mode."
            contract = ContentContract(mode=mode, course="Test Course", must=["reasonable_length"])
            
            # Should not raise exception for any mode
            result = enforce_contract(text, contract)
            assert result is not None
    
    def test_enforce_contract_with_various_requirements(self):
        """Test contract enforcement with various requirement combinations."""
        requirement_sets = [
            ["reasonable_length"],
            [">=3_bullets", "personalized"],
            ["quoted_script", "actionable", "empathy"],
            ["apel_definition_strict", "tie_to_course"],
            ["script_and_bullets", "commercial_teaching"]
        ]
        
        for requirements in requirement_sets:
            text = "Test response."
            contract = ContentContract(
                mode="guidance", 
                course="Test Course", 
                must=requirements
            )
            
            # Should not raise exception for any requirement set
            result = enforce_contract(text, contract)
            assert result is not None


class TestContractMemoization:
    """Test contract enforcement memoization functionality."""
    
    def setup_method(self):
        """Clear cache before each test."""
        clear_contract_cache()
    
    @patch('app.ai.contract_enforcer.rewrite_answer')
    def test_memoization_caches_results(self, mock_rewrite):
        """Test that identical contract applications are cached."""
        text = "This is a test response."
        contract = ContentContract(mode="policy", course="Test Course", must=["reasonable_length"])
        mock_rewrite.return_value = "Rewritten response."
        
        # First call should call rewrite_answer
        result1 = enforce_contract(text, contract)
        assert result1 == "Rewritten response."
        assert mock_rewrite.call_count == 1
        
        # Second call should use cache
        result2 = enforce_contract(text, contract)
        assert result2 == "Rewritten response."
        assert mock_rewrite.call_count == 1  # Should not have been called again
    
    @patch('app.ai.contract_enforcer.rewrite_answer')
    def test_different_contracts_not_cached(self, mock_rewrite):
        """Test that different contracts are not cached together."""
        text = "This is a test response."
        contract1 = ContentContract(mode="policy", course="Test Course", must=["reasonable_length"])
        contract2 = ContentContract(mode="apel", course="Test Course", must=["apel_definition_strict"])
        mock_rewrite.return_value = "Rewritten response."
        
        # First call with contract1
        result1 = enforce_contract(text, contract1)
        assert result1 == "Rewritten response."
        assert mock_rewrite.call_count == 1
        
        # Second call with different contract should call rewrite again
        result2 = enforce_contract(text, contract2)
        assert result2 == "Rewritten response."
        assert mock_rewrite.call_count == 2
    
    def test_cache_clearing(self):
        """Test that cache clearing works."""
        from app.ai.contract_enforcer import _contract_cache
        
        # Add something to cache
        _contract_cache["test_key"] = "test_value"
        assert len(_contract_cache) == 1
        
        # Clear cache
        clear_contract_cache()
        assert len(_contract_cache) == 0


if __name__ == "__main__":
    pytest.main([__file__])
