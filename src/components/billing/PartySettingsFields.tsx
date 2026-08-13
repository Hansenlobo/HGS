import { Input } from "@/components/ui/Input";

export interface PartySettingsFieldsProps {
  partyPercentage: string;
  onPartyPercentageChange: (value: string) => void;
  error?: string;
}

export function PartySettingsFields({
  partyPercentage,
  onPartyPercentageChange,
  error,
}: PartySettingsFieldsProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Input
        label="Party Percentage (%)"
        type="number"
        step="0.01"
        min={0}
        max={100}
        inputMode="decimal"
        hint="Markup applied to products flagged Is Party Product"
        value={partyPercentage}
        onChange={(e) => onPartyPercentageChange(e.target.value)}
        error={error}
      />
    </div>
  );
}
