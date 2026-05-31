export type RootStackParamList = {
  Dashboard: undefined;
  Rules: undefined;
  // ruleId omitted => creating a new rule.
  RuleEdit: { ruleId?: string } | undefined;
  Paywall: undefined;
};
