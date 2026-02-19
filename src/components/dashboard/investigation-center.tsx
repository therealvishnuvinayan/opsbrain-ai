"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileSearch, PackageCheck, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const investigationCards = [
  {
    title: "Investigate a Run",
    description: "Open run-level traces and isolate reconciliation bottlenecks.",
    cta: "Open Run Investigator",
    href: "/runs",
    icon: FileSearch,
  },
  {
    title: "Find Root Cause",
    description: "Correlate anomalies across supplier, transformation, and matching stages.",
    cta: "Start Root Cause Flow",
    href: "/investigation",
    icon: SearchCheck,
  },
  {
    title: "Generate Evidence Bundle",
    description: "Assemble decision-ready evidence for finance, ops, and audit teams.",
    cta: "Generate Bundle",
    href: "/actions",
    icon: PackageCheck,
  },
];

export function InvestigationCenter() {
  return (
    <section className="space-y-4" aria-label="Investigation center">
      <h2 className="text-lg font-semibold">Investigation Center</h2>
      <div className="space-y-3">
        {investigationCards.map((card) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.title}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Card className="border-white/55 dark:border-slate-800/85">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>{card.description}</p>
                  <Link href={card.href} className="block">
                    <Button variant="outline" className="w-full justify-between">
                      {card.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
