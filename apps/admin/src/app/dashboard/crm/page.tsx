"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { CrmHeader } from "./components/crm-header";
import { LeadTable } from "./components/lead-table";
import { LeadKanban } from "./components/lead-kanban";
import { PipelineStats } from "./components/pipeline-stats";
import { SourceBreakdown } from "./components/source-breakdown";
import { RecoveryQueue } from "./components/recovery-queue";
import { LeadFollowUp } from "./components/lead-followup";

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      <CrmHeader onLeadCreated={triggerRefresh} />
      <Tabs defaultValue="pipeline" value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="pipeline">Pipeline Board</TabsTrigger>
          <TabsTrigger value="table">Leads Table</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <LeadKanban refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </TabsContent>

        <TabsContent value="table">
          <LeadTable refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="overview">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            <PipelineStats />
            <SourceBreakdown />
          </div>
        </TabsContent>

        <TabsContent value="followup">
          <LeadFollowUp refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="recovery">
          <RecoveryQueue refreshKey={refreshKey} onRecovered={triggerRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
