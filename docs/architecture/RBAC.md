# Role-Based Access Control (RBAC)

> **PRD Reference:** [PRD.md](../PRD.md) — Security Architecture (§ Role-Based Access Control), Dashboard UI Architecture  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Role Hierarchy

```
Super Admin
    │
    ├── Admin
    │       ├── Writer
    │       ├── Media Manager
    │       ├── Marketer
    │       ├── Sales Executive
    │       ├── Project Manager
    │       ├── Finance Manager
    │       └── Artist Manager
    │
    └── Client (Portal — isolated, no dashboard access)
```

---

## 2. Role Definitions

### 2.1 Super Admin

| Property | Value |
|----------|-------|
| ID | `super_admin` |
| Description | Full system access — user management, role management, permissions, security settings |
| Scope | System-wide |
| Assignable by | Only Super Admin |
| Max count | 1-2 recommended |

### 2.2 Admin

| Property | Value |
|----------|-------|
| ID | `admin` |
| Description | All platform functions except permission architecture and system-level security settings |
| Scope | Platform-wide |
| Assignable by | Super Admin |

### 2.3 Writer

| Property | Value |
|----------|-------|
| ID | `writer` |
| Description | Create, edit, publish content; manage posts, pages, resources |
| Scope | Content module |
| Assignable by | Admin, Super Admin |

### 2.4 Media Manager

| Property | Value |
|----------|-------|
| ID | `media_manager` |
| Description | Manage media library, releases, streaming links, galleries |
| Scope | Media module |
| Assignable by | Admin, Super Admin |

### 2.5 Sales Executive

| Property | Value |
|----------|-------|
| ID | `sales_executive` |
| Description | Manage leads, CRM, lead notes, lead status |
| Scope | CRM module |
| Assignable by | Admin, Super Admin |

### 2.6 Marketer

| Property | Value |
|----------|-------|
| ID | `marketer` |
| Description | Manage SEO, analytics, newsletter, campaign content |
| Scope | Marketing modules |
| Assignable by | Admin, Super Admin |

### 2.7 Project Manager

| Property | Value |
|----------|-------|
| ID | `project_manager` |
| Description | Manage freelance projects, milestones, deliverables, client portal; view finance for assigned projects |
| Scope | Operations — Freelance Projects |
| Assignable by | Admin, Super Admin |

### 2.8 Finance Manager

| Property | Value |
|----------|-------|
| ID | `finance_manager` |
| Description | Full Finance module access (payments, expenses, invoices); read-only access to projects and events |
| Scope | Finance module (read-only on Projects/Events) |
| Assignable by | Admin, Super Admin |

### 2.9 Artist Manager

| Property | Value |
|----------|-------|
| ID | `artist_manager` |
| Description | Manage artist events, logistics, availability; view event finance |
| Scope | Artist Events module |
| Assignable by | Admin, Super Admin |

### 2.10 Client (Portal)

| Property | Value |
|----------|-------|
| ID | `client` |
| Description | Read-only access to their specific project via portal token; submit deliverable feedback and approvals; send portal messages |
| Scope | Single project via portal (no dashboard access) |
| Auth | Token-based (not session-based) |

---

## 3. Permission Registry

### 3.1 Content Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `content.create` | Create any content | Super Admin, Admin, Writer |
| `content.edit` | Edit any content | Super Admin, Admin, Writer |
| `content.publish` | Change content status to published | Super Admin, Admin, Writer |
| `content.delete` | Delete any content | Super Admin, Admin |
| `content.schedule` | Set publish_at/unpublish_at | Super Admin, Admin, Writer |
| `content.reorder` | Reorder content (services, sections) | Super Admin, Admin |

### 3.2 Media Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `media.upload` | Upload files | Super Admin, Admin, Media Manager |
| `media.edit` | Edit media metadata | Super Admin, Admin, Media Manager |
| `media.delete` | Delete media assets | Super Admin, Admin, Media Manager |
| `media.manage_folders` | Create/rename/delete folders | Super Admin, Admin, Media Manager |

### 3.3 CRM Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `crm.view_leads` | View lead list and details | Super Admin, Admin, Sales Executive |
| `crm.create_lead` | Create new leads | Super Admin, Admin, Sales Executive |
| `crm.edit_lead` | Edit lead fields | Super Admin, Admin, Sales Executive |
| `crm.delete_lead` | Delete leads | Super Admin, Admin |
| `crm.change_status` | Change lead pipeline status | Super Admin, Admin, Sales Executive |
| `crm.assign_lead` | Assign leads to users | Super Admin, Admin |
| `crm.add_note` | Add internal lead notes | Super Admin, Admin, Sales Executive |
| `crm.export_leads` | Export lead data | Super Admin, Admin |

### 3.4 Freelance Project Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `project.create` | Create freelance projects | Super Admin, Admin, Project Manager |
| `project.edit` | Edit project details | Super Admin, Admin, Project Manager |
| `project.delete` | Delete projects | Super Admin, Admin |
| `project.change_status` | Change project status | Super Admin, Admin, Project Manager |
| `project.manage_milestones` | CRUD milestones | Super Admin, Admin, Project Manager |
| `project.manage_deliverables` | Upload/manage deliverables | Super Admin, Admin, Project Manager |
| `project.assign_team` | Assign team members | Super Admin, Admin |

### 3.5 Event Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `event.create` | Create events | Super Admin, Admin, Artist Manager |
| `event.edit` | Edit event details | Super Admin, Admin, Artist Manager |
| `event.delete` | Delete events | Super Admin, Admin |
| `event.change_status` | Change event status | Super Admin, Admin, Artist Manager |
| `event.manage_logistics` | Manage event logistics | Super Admin, Admin, Artist Manager |
| `event.manage_availability` | Manage availability calendar | Super Admin, Admin, Artist Manager |

### 3.6 Finance Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `finance.view_all` | View all finance data | Super Admin, Admin, Finance Manager |
| `finance.view_project` | View project finance (assigned) | Project Manager |
| `finance.view_event` | View event finance | Artist Manager |
| `finance.create_payment` | Log payments | Super Admin, Admin, Finance Manager |
| `finance.create_expense` | Log expenses | Super Admin, Admin, Finance Manager |
| `finance.create_invoice` | Generate invoices | Super Admin, Admin, Finance Manager |
| `finance.manage_payment_methods` | CRUD payment methods | Super Admin, Admin, Finance Manager |

### 3.7 Portal Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `portal.manage` | Enable/disable portal access | Super Admin, Admin, Project Manager |
| `portal.send_message` | Send messages via portal | Super Admin, Admin, Project Manager |
| `portal.view_messages` | View portal message threads | Super Admin, Admin, Project Manager |

### 3.8 Proposal Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `proposal.manage_templates` | CRUD proposal templates | Super Admin, Admin |
| `proposal.generate` | Generate proposal documents | Super Admin, Admin, Project Manager |
| `proposal.send` | Mark proposal as sent | Super Admin, Admin, Project Manager |
| `proposal.accept` | Mark proposal as accepted | Super Admin, Admin |

### 3.9 Newsletter Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `newsletter.manage_campaigns` | CRUD and send campaigns | Super Admin, Admin, Marketer |
| `newsletter.manage_subscribers` | View/manage subscribers | Super Admin, Admin, Marketer |
| `newsletter.export` | Export subscriber data | Super Admin, Admin |

### 3.10 SEO Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `seo.manage_metadata` | Edit SEO metadata | Super Admin, Admin, Marketer |
| `seo.manage_redirects` | Create/edit redirects | Super Admin, Admin, Marketer |
| `seo.manage_robots` | Edit robots.txt rules | Super Admin, Admin |
| `seo.reindex` | Trigger sitemap regeneration | Super Admin, Admin, Marketer |

### 3.11 System Permissions

| Permission ID | Description | Default Roles |
|---------------|-------------|---------------|
| `system.manage_users` | CRUD users | Super Admin |
| `system.manage_roles` | CRUD roles and assignments | Super Admin |
| `system.manage_permissions` | Modify permission assignments | Super Admin |
| `system.manage_settings` | Change system settings | Super Admin, Admin |
| `system.view_audit_logs` | View audit log | Super Admin, Admin |

---

## 4. Permission-to-Role Mapping Matrix

| Permission | Super Admin | Admin | Writer | Media Mgr | Sales Exec | Marketer | Project Mgr | Finance Mgr | Artist Mgr |
|------------|:-----------:|:-----:|:------:|:---------:|:----------:|:--------:|:-----------:|:-----------:|:----------:|
| content.create | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| content.edit | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| content.publish | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| content.delete | ✅ | ✅ | — | — | — | — | — | — | — |
| content.schedule | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| content.reorder | ✅ | ✅ | — | — | — | — | — | — | — |
| media.upload | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| media.edit | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| media.delete | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| media.manage_folders | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| crm.view_leads | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| crm.create_lead | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| crm.edit_lead | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| crm.delete_lead | ✅ | ✅ | — | — | — | — | — | — | — |
| crm.change_status | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| crm.assign_lead | ✅ | ✅ | — | — | — | — | — | — | — |
| crm.add_note | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| crm.export_leads | ✅ | ✅ | — | — | — | — | — | — | — |
| project.create | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| project.edit | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| project.delete | ✅ | ✅ | — | — | — | — | — | — | — |
| project.change_status | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| project.manage_milestones | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| project.manage_deliverables | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| project.assign_team | ✅ | ✅ | — | — | — | — | — | — | — |
| event.create | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| event.edit | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| event.delete | ✅ | ✅ | — | — | — | — | — | — | — |
| event.change_status | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| event.manage_logistics | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| event.manage_availability | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| finance.view_all | ✅ | ✅ | — | — | — | — | — | ✅ | — |
| finance.view_project | ✅ | ✅ | — | — | — | — | ✅ (assigned) | ✅ | — |
| finance.view_event | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ |
| finance.create_payment | ✅ | ✅ | — | — | — | — | — | ✅ | — |
| finance.create_expense | ✅ | ✅ | — | — | — | — | — | ✅ | — |
| finance.create_invoice | ✅ | ✅ | — | — | — | — | — | ✅ | — |
| finance.manage_payment_methods | ✅ | ✅ | — | — | — | — | — | ✅ | — |
| portal.manage | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| portal.send_message | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| portal.view_messages | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| proposal.manage_templates | ✅ | ✅ | — | — | — | — | — | — | — |
| proposal.generate | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| proposal.send | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| proposal.accept | ✅ | ✅ | — | — | — | — | — | — | — |
| newsletter.manage_campaigns | ✅ | ✅ | — | — | — | ✅ | — | — | — |
| newsletter.manage_subscribers | ✅ | ✅ | — | — | — | ✅ | — | — | — |
| newsletter.export | ✅ | ✅ | — | — | — | — | — | — | — |
| seo.manage_metadata | ✅ | ✅ | — | — | — | ✅ | — | — | — |
| seo.manage_redirects | ✅ | ✅ | — | — | — | ✅ | — | — | — |
| seo.manage_robots | ✅ | ✅ | — | — | — | — | — | — | — |
| seo.reindex | ✅ | ✅ | — | — | — | ✅ | — | — | — |
| system.manage_users | ✅ | — | — | — | — | — | — | — | — |
| system.manage_roles | ✅ | — | — | — | — | — | — | — | — |
| system.manage_permissions | ✅ | — | — | — | — | — | — | — | — |
| system.manage_settings | ✅ | ✅ | — | — | — | — | — | — | — |
| system.view_audit_logs | ✅ | ✅ | — | — | — | — | — | — | — |

---

## 5. Dashboard Access Rules

| Dashboard Route | Required Permission | Role Access |
|----------------|---------------------|-------------|
| `/dashboard` (home) | `content.view_own` or any module permission | All roles except Client |
| `/dashboard/content/*` | `content.*` | Super Admin, Admin, Writer |
| `/dashboard/blog/*` | `content.*` | Super Admin, Admin, Writer |
| `/dashboard/projects/*` | `content.*` | Super Admin, Admin, Writer |
| `/dashboard/services/*` | `content.*` | Super Admin, Admin, Writer |
| `/dashboard/media/*` | `media.*` | Super Admin, Admin, Media Manager |
| `/dashboard/crm/*` | `crm.*` | Super Admin, Admin, Sales Executive |
| `/dashboard/forms/*` | `crm.*` | Super Admin, Admin, Sales Executive |
| `/dashboard/freelance/*` | `project.*` | Super Admin, Admin, Project Manager |
| `/dashboard/events/*` | `event.*` | Super Admin, Admin, Artist Manager |
| `/dashboard/finance/*` | `finance.*` | Super Admin, Admin, Finance Manager |
| `/dashboard/portal/*` | `portal.manage` | Super Admin, Admin, Project Manager |
| `/dashboard/proposals/*` | `proposal.*` | Super Admin, Admin, Project Manager |
| `/dashboard/newsletter/*` | `newsletter.*` | Super Admin, Admin, Marketer |
| `/dashboard/seo/*` | `seo.*` | Super Admin, Admin, Marketer |
| `/dashboard/users/*` | `system.manage_users` | Super Admin only |
| `/dashboard/settings/*` | `system.manage_settings` | Super Admin, Admin |

---

## 6. Client Portal Permissions

The Client role does not access the admin dashboard. All permissions are implicit through the portal token:

| Action | Allowed? | Notes |
|--------|----------|-------|
| View project overview | ✅ | Via portal token scope |
| View milestones | ✅ | Read-only |
| View deliverables | ✅ | Read files + leave feedback |
| Approve deliverable | ✅ | Triggers status change |
| Request revision | ✅ | With feedback message |
| View payment summary | ✅ | Total, paid, pending only |
| Download invoices | ✅ | PDF download |
| Send messages | ✅ | Via portal messaging |
| View admin dashboard | ❌ | No access |
| View other projects | ❌ | Scoped to single project |
| Manage project settings | ❌ | Admin-only actions |

---

## 7. Permission Enforcement

### 7.1 Middleware Level (API Routes)

```typescript
// Middleware checks authentication + permission
export async function requirePermission(permissionId: string) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();

  const hasPermission = await checkUserPermission(session.user.id, permissionId);
  if (!hasPermission) throw new ForbiddenError();
}
```

### 7.2 Component Level (UI)

```typescript
// Conditionally render actions based on permissions
function LeadActions({ lead }: { lead: Lead }) {
  const { can } = usePermissions();

  return (
    <div>
      {can('crm.change_status') && <StatusDropdown lead={lead} />}
      {can('crm.assign_lead') && <AssignButton lead={lead} />}
      {can('crm.delete_lead') && <DeleteButton lead={lead} />}
    </div>
  );
}
```

### 7.3 Data Level (Repository)

```typescript
// Repository filters results based on user's scope
class ProjectRepository {
  async findAccessible(userId: string, role: string): Promise<Project[]> {
    if (role === 'super_admin' || role === 'admin') {
      return this.findAll();
    }
    if (role === 'project_manager') {
      return this.findAssignedTo(userId);
    }
    return [];
  }
}
```
