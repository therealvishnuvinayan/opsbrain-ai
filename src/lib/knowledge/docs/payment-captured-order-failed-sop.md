---
title: Payment Captured But Order Failed SOP
source: local://sops/payment-captured-order-failed
domain: billing
tags: sop,billing,orders,payment,mismatch
---

# Payment Captured But Order Failed SOP

Apply this SOP when payment succeeded or billing was captured, but the order remained failed.

## Required verification

- Confirm the billing status is captured, settled, or otherwise successful.
- Confirm the order status is failed, blocked, or canceled.
- Check whether audit logs show the failure before or after payment capture.

## Operational checks

- Review supplier processing to confirm whether fulfillment failed after billing.
- Review card creation to confirm whether any cards were issued before the failure.
- Check for retry or recovery activity in audit logs before asking finance to reverse or refund.

## Recommended next checks

- Billing capture versus order state mismatch.
- Supplier processing after payment capture.
- Card issuance status and any partial fulfillment.

## Escalation path

If payment is captured and there is no recovery path, escalate to finance and include the billing state, audit timeline, and supplier status in the handoff.
