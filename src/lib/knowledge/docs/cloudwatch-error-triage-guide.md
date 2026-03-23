---
title: CloudWatch Error Triage Guide
source: local://guides/cloudwatch-error-triage
domain: aws
tags: guide,aws,cloudwatch,backend,errors,incident
---

# CloudWatch Error Triage Guide

Use this guide when Ops suspects a backend or service-side issue contributed to an order, payment, or reconciliation problem.

## First checks

- Look for recent error and warning events in the affected time window.
- Identify the service and the latest significant error before assuming a business-data problem.
- Compare the error window with the order or reconciliation timeline.

## What to check next

- The latest significant backend error and whether it repeats.
- The affected service or log group.
- Whether the same time window overlaps with order failure, audit gaps, or reconciliation delays.

## Escalation

Escalate to platform only after confirming that the timing and repeated error pattern line up with the operational issue you are investigating.
