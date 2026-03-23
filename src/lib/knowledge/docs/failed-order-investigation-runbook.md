---
title: Failed Order Investigation Runbook
source: local://runbooks/failed-order-investigation
domain: orders
tags: runbook,orders,failures,payments,audit
---

# Failed Order Investigation Runbook

Use this runbook when an order is failed, blocked, or delayed and Ops needs a quick investigation path.

## First checks

- Confirm the order status and updated time from the order details screen.
- Compare billing status with the order status to see whether payment was captured before the failure.
- Review card and item counts to confirm whether fulfillment stopped before card creation.

## Audit validation

- Check audit activity after the last successful payment or supplier event.
- Look for repeated error events, blocked transitions, or missing downstream events.
- If there is no recent audit activity, treat the issue as a manual investigation case.

## What to check next

- Payment capture state and any mismatch between billing and order status.
- Supplier processing and whether the order progressed past fulfillment handoff.
- Card creation, especially when items exist but cards are missing.

## Escalation

Escalate to finance if payment remains captured but the order cannot be recovered. Escalate to the supplier team if supplier processing is the last successful stage.
