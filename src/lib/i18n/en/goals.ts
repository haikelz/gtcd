// English messages: goals. Keys are "goals.<name>"; {param} placeholders.
export default {
  "goals.add": "Add goal",
  "goals.addTitle": "Add a goal",
  "goals.adminOnly": "Only admins can add, rename or delete goals.",
  "goals.columnChange": "Change",
  "goals.columnGoal": "Goal",
  "goals.columnRate": "Conversion rate",
  "goals.columnVisitors": "Visitors",
  "goals.created": "Goal added.",
  "goals.delete": "Delete",
  "goals.deleteLabel": "Delete {name}",
  "goals.deleted": "Goal deleted.",
  "goals.denominator":
    "Conversion rate is goal visitors divided by {total} visitors in the period.",
  "goals.description":
    "Visitors who reached an event or page, and their share of all visitors.",
  "goals.duplicate": "A goal for this event or page already exists.",
  "goals.emptyAdmin": "Add an event or page below to count who reaches it.",
  "goals.emptyTitle": "No goals yet",
  "goals.emptyViewer": "An admin can add goals for this site.",
  "goals.help":
    "Counts the visitors who reached each goal in the period. GoatCounter records no sessions, so this is not a step-by-step funnel.",
  "goals.invalid":
    "Enter a name of 1 to 60 characters and an event name or page path.",
  "goals.invalidName": "Enter a name of 1 to 60 characters.",
  "goals.kind": "Type",
  "goals.kindEvent": "Event",
  "goals.kindPage": "Page",
  "goals.limit":
    "This site already has {limit} goals. Delete one to add another.",
  "goals.loadFailed": "Goal counts could not load. Retry in a moment.",
  "goals.loading": "Loading goal counts",
  "goals.manageDescription":
    "Up to {max} goals per site. Deleting a goal keeps the GoatCounter data.",
  "goals.manageTitle": "Manage goals",
  "goals.name": "Name",
  "goals.nameFor": "Name for {path}",
  "goals.nav": "Goals",
  "goals.noVisitors": "No visitors in the period",
  "goals.notCounted": "Not counted",
  "goals.notFound": "This goal no longer exists. Reload the page.",
  "goals.path": "Event name or page path",
  "goals.pathHelp":
    "Use the name GoatCounter shows, such as signup-click or /pricing.",
  "goals.rename": "Save name",
  "goals.renamed": "Goal renamed.",
  "goals.reportTitle": "Goal conversions",
  "goals.scanIncomplete":
    "This site has more than {limit} paths. Goals whose path was not among the first {limit} show no count.",
  "goals.seoDescription": "Goal conversions for your GoatCounter site.",
  "goals.seoTitle": "Goals",
  "goals.storageLoadFailed":
    "Goals could not load because storage is not responding. Retry in a moment.",
  "goals.storageSaveFailed":
    "Storage is not responding, so nothing was saved. Retry in a moment.",
  "goals.tableCaption": "Goal visitors and conversion rates for the period",
  "goals.title": "Goals",
} as const satisfies Record<`goals.${string}`, string>;
