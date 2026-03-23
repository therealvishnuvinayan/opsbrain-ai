---
title: Invalid Product-Brand Cards Troubleshooting Guide
source: local://guides/invalid-product-brand-cards
domain: reconciliation
tags: guide,reconciliation,product-brand,mapping,cards
---

# Invalid Product-Brand Cards Troubleshooting Guide

Use this guide when reconciliation reports invalid product-brand card issues.

## Investigation checklist

- Validate the product-brand mapping table used by the affected supplier.
- Compare the supplier template version with the active mapping version.
- Check whether the same supplier or brand appears across multiple invalid records.

## Practical next checks

- Product-brand mapping accuracy.
- Supplier template version drift.
- Whether corrected records need to be requeued after the mapping fix.

## Recovery note

Do not rerun reconciliation until the mapping issue is fixed, or the same invalid cards will return in the next reconciliation cycle.
