/**
 * Frontend Intelligence Tests
 * Component-level validation (NO E2E)
 * 
 * Tests: Locked UI, Error Mapping, Optimistic UI Protection
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ErrorCode } from '../../../../../backend/src/types/errors';

// Mock component - replace with actual import
import ItemEditForm from '../ItemEditForm';

// Mock API responses
const mockItemWithMovement = {
  id: 1,
  code: 'ITEM-001',
  name: 'Test Item',
  name_ar: 'صنف تجريبي',
  base_uom_id: 1,
  tracking_policy: 'none',
  valuation_method: 'fifo',
  is_composite: false,
  has_movement: true, // ← KEY: Item has movements
  is_active: true,
};

const mockItemWithoutMovement = {
  ...mockItemWithMovement,
  id: 2,
  code: 'ITEM-002',
  has_movement: false, // ← No movements
};

describe('Frontend Intelligence Tests', () => {
  describe('Test 1: Locked Item UI', () => {
    it('should disable policy fields when item has movements', async () => {
      render(<ItemEditForm item={mockItemWithMovement} />);

      // Policy fields should be disabled
      const baseUomField = screen.getByLabelText(/base uom/i);
      const trackingPolicyField = screen.getByLabelText(/tracking policy/i);
      const valuationMethodField = screen.getByLabelText(/valuation method/i);
      const isCompositeField = screen.getByLabelText(/composite/i);

      expect(baseUomField).toBeDisabled();
      expect(trackingPolicyField).toBeDisabled();
      expect(valuationMethodField).toBeDisabled();
      expect(isCompositeField).toBeDisabled();
    });

    it('should show lock icon tooltips explaining why fields are locked', async () => {
      render(<ItemEditForm item={mockItemWithMovement} />);

      // Lock icons should be present
      const lockIcons = screen.getAllByTestId(/lock-icon/i);
      expect(lockIcons.length).toBeGreaterThan(0);

      // Hover over lock icon to show tooltip
      const user = userEvent.setup();
      await user.hover(lockIcons[0]);

      // Tooltip should explain why locked
      await waitFor(() => {
        expect(
          screen.getByText(/locked after first inventory movement/i)
        ).toBeInTheDocument();
      });
    });

    it('should allow non-policy fields even when item has movements', async () => {
      render(<ItemEditForm item={mockItemWithMovement} />);

      // Non-policy fields should remain enabled
      const nameField = screen.getByLabelText(/^name$/i);
      const descriptionField = screen.getByLabelText(/description/i);
      const standardCostField = screen.getByLabelText(/standard cost/i);

      expect(nameField).not.toBeDisabled();
      expect(descriptionField).not.toBeDisabled();
      expect(standardCostField).not.toBeDisabled();
    });

    it('should enable policy fields when item has NO movements', async () => {
      render(<ItemEditForm item={mockItemWithoutMovement} />);

      // Policy fields should be enabled
      const baseUomField = screen.getByLabelText(/base uom/i);
      const trackingPolicyField = screen.getByLabelText(/tracking policy/i);

      expect(baseUomField).not.toBeDisabled();
      expect(trackingPolicyField).not.toBeDisabled();
    });
  });

  describe('Test 2: Error Mapping', () => {
    it('should map ITEM_POLICY_LOCKED error to translated message', async () => {
      // Mock API error response
      const apiError = {
        error: {
          code: ErrorCode.ITEM_POLICY_LOCKED,
          message: 'Cannot modify locked fields: base_uom_id',
          entity: 'item',
          entity_id: 1,
          fields: ['base_uom_id'],
          hint: 'Policy fields are locked after first inventory movement.',
        },
      };

      // Mock fetch to return error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => apiError,
      });

      render(<ItemEditForm item={mockItemWithoutMovement} />);

      // Submit form with locked field change
      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      // Should display user-friendly Arabic/English message
      await waitFor(() => {
        expect(
          screen.getByText(/لا يمكن تعديل الحقول المقفلة/i) || // Arabic
            screen.getByText(/cannot modify locked fields/i) // English
        ).toBeInTheDocument();
      });

      // Should display hint
      await waitFor(() => {
        expect(
          screen.getByText(/locked after first inventory movement/i)
        ).toBeInTheDocument();
      });
    });

    it('should map ITEM_HAS_MOVEMENT error to translated message', async () => {
      const apiError = {
        error: {
          code: ErrorCode.ITEM_HAS_MOVEMENT,
          message: 'Cannot delete item. Item has inventory movements.',
          entity: 'item',
          entity_id: 1,
          hint: 'Set is_active=false instead of deleting.',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => apiError,
      });

      render(<ItemEditForm item={mockItemWithMovement} />);

      // Attempt delete
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      // Should display user-friendly message
      await waitFor(() => {
        expect(
          screen.getByText(/لا يمكن حذف صنف له حركات/i) || // Arabic
            screen.getByText(/cannot delete item with movements/i) // English
        ).toBeInTheDocument();
      });

      // Should display hint (alternative action)
      await waitFor(() => {
        expect(
          screen.getByText(/set is_active=false/i)
        ).toBeInTheDocument();
      });
    });

    it('should display field-specific error messages for multi-field errors', async () => {
      const apiError = {
        error: {
          code: ErrorCode.ITEM_POLICY_LOCKED,
          message: 'Cannot modify locked fields: base_uom_id, tracking_policy',
          fields: ['base_uom_id', 'tracking_policy'],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => apiError,
      });

      render(<ItemEditForm item={mockItemWithoutMovement} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      // Should highlight specific locked fields
      await waitFor(() => {
        const baseUomField = screen.getByLabelText(/base uom/i);
        const trackingPolicyField = screen.getByLabelText(/tracking policy/i);

        expect(baseUomField.closest('div')).toHaveClass('error');
        expect(trackingPolicyField.closest('div')).toHaveClass('error');
      });
    });
  });

  describe('Test 3: Optimistic UI Protection', () => {
    it('should prevent save button click when policy fields are modified on locked item', async () => {
      // Mock item that APPEARS unlocked but will fail on server
      const sneakyItem = {
        ...mockItemWithMovement,
        // Frontend shows has_movement=false (bug scenario)
        has_movement: false,
      };

      render(<ItemEditForm item={sneakyItem} />);

      // User changes policy field
      const baseUomField = screen.getByLabelText(/base uom/i);
      await userEvent.selectOptions(baseUomField, '2');

      // Submit button should be DISABLED or show warning
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Optimistic protection: re-check has_movement before save
      await userEvent.click(submitButton);

      // Should NOT call API (prevented by client-side check)
      expect(global.fetch).not.toHaveBeenCalled();

      // Should show warning
      await waitFor(() => {
        expect(
          screen.getByText(/cannot modify policy fields/i)
        ).toBeInTheDocument();
      });
    });

    it('should disable save button while request is in flight', async () => {
      render(<ItemEditForm item={mockItemWithoutMovement} />);

      // Mock slow API response
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              1000
            )
          )
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      // Button should be disabled immediately
      expect(submitButton).toBeDisabled();

      // Button should show loading state
      expect(submitButton).toHaveTextContent(/saving|loading/i);

      // After response, button should re-enable
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );
    });

    it('should prevent double-submit during async save', async () => {
      render(<ItemEditForm item={mockItemWithoutMovement} />);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }),
            500
          )
        );
      });

      const submitButton = screen.getByRole('button', { name: /save/i });

      // Click button rapidly (simulate double-click)
      await userEvent.click(submitButton);
      await userEvent.click(submitButton);
      await userEvent.click(submitButton);

      // Should only call API ONCE
      await waitFor(() => {
        expect(callCount).toBe(1);
      });
    });
  });
});

/**
 * Test Summary:
 * 
 * Test 1: Locked Item UI (4 assertions)
 *   ✅ Disables policy fields when has_movement=true
 *   ✅ Shows lock icon tooltips with explanations
 *   ✅ Allows non-policy fields
 *   ✅ Enables policy fields when has_movement=false
 * 
 * Test 2: Error Mapping (3 assertions)
 *   ✅ Maps ITEM_POLICY_LOCKED to translated message
 *   ✅ Maps ITEM_HAS_MOVEMENT to translated message
 *   ✅ Displays field-specific errors
 * 
 * Test 3: Optimistic UI Protection (3 assertions)
 *   ✅ Prevents save when policy fields modified on locked item
 *   ✅ Disables save button during async request
 *   ✅ Prevents double-submit
 * 
 * Total: 10 frontend intelligence tests
 * 
 * NO E2E, NO Playwright, NO Cypress
 * Just React Testing Library (RTL) + Jest
 * 
 * Next: Update package.json, create completion report
 */
