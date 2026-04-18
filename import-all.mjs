async function main() {
  await importCSV("programs-export-2026-04-14_21-25-04.csv", "programs");
  await importCSV("approval_history-export-2026-04-14_21-24-28.csv", "approval_history");
  await importCSV("user_roles-export-2026-04-14_21-26-24.csv", "user_roles");
  await importCSV("user_addresses-export-2026-04-14_21-26-05.csv", "user_addresses");
  await importCSV("trips-export-2026-04-14_21-25-17.csv", "trips");
  await importCSV("mileage_vouchers-export-2026-04-14_21-24-41.csv", "mileage_vouchers");
  await importCSV("profiles_approver_view-export-2026-04-14_21-25-42.csv", "profiles_approver_view");

  console.log("\n🎉 All imports complete!");
  process.exit(0);
}