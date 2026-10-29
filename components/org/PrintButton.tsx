"use client";

import { Button } from "../ui/Button";

export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()}>
      Распечатать
    </Button>
  );
}
