---
title: Reconciliation Mismatch Response Runbook
source: local://runbooks/reconciliation-mismatch-response
domain: reconciliation
tags: runbook,reconciliation,mismatch,buffered,finance
---

# Reconciliation Mismatch Response Runbook

Use this runbook when a reconciliation history shows buffered records, mismatches, or incomplete reconciliation outcomes.

## Core checks

- Compare buffered record count with reconciled record count.
- Review invalid product-brand card records and expired card records first because they often block completion.
- Review supplier summary output to isolate whether one supplier is driving the mismatch.

## What Ops should do next

- Validate product-brand mapping for any invalid product-brand cards.
- Check expired card handling before reprocessing buffered records.
- Confirm supplier template version and mapping configuration before rerunning reconciliation.

## When to rerun

Only rerun reconciliation after the blocking mismatch type is understood. If buffered records remain without a clear cause, escalate with example record ids and the supplier summary.
