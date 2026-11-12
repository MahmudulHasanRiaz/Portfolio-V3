"use client";

import { useEffect, useState } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import Link from "next/link";
import {
  getProfile,
  saveProfile,
  getDesignations,
  saveDesignations,
  type Designation,
} from "@/actions/profile";

// Profile admin — the `person_profiles` row (name / email / location /
// phone / bio) plus the 5 designations (Know Me identity cells).
// Designations are stored as TWO separate settings keys (`designations`
// + `designations_bn`, positional overlay by index); the profile page is
// the only writer, the Public Content API only reads them.
//
// LIVE COPY PRE-FILL: when the settings keys are empty, the editor is
// pre-filled with the CURRENT live copy from Portfolio-Public main
// (src/data/site.ts PROFILE.designations + src/i18n/en.ts identity*Text
// + src/i18n/bn.ts) — the admin sees the live values and can edit them.
// Nothing here is invented; a row with no live value stays empty.

const LIVE_DESIGNATIONS: Designation[] = [
  {
    title: "Software Engineer",
    description:
      "Builds ERP, e-commerce and SaaS systems for businesses in Bangladesh and beyond.",
  },
  {
    title: "Entrepreneur",
    description:
      "Building companies that solve real problems for Bangladeshi businesses.",
  },
  {
    title: "Nasheed Artist",
    description:
      "Records nasheed without music — just voice, lyrics and meaning.",
  },
  {
    title: "Hafiz-Alem",
    description: "Hafiz of the Qur'an, trained as an Alem.",
  },
  {
    title: "Public Figure",
    description: "Speaking, teaching and sharing — in person and online.",
  },
];

const LIVE_DESIGNATIONS_BN: Designation[] = [
  {
    title: "সফটওয়্যার ইঞ্জিনিয়ার",
    description:
      "বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম বানান।",
  },
  {
    title: "উদ্যোক্তা",
    description:
      "বাংলাদেশি বিজনেসের আসল সমস্যা সমাধান করে এমন কোম্পানি গড়ছেন।",
  },
  {
    title: "নাশিদ শিল্পী",
    description:
      "সংগীত ছাড়া নাশিদ রেকর্ড করেন — শুধু কণ্ঠ, কথা ও অর্থ।",
  },
  {
    title: "হাফিজ-আলেম",
    description: "কুরআনের হাফিজ, আলেম হিসেবে প্রশিক্ষিত।",
  },
  {
    title: "পাবলিক ফিগার",
    description: "সরাসরি আর অনলাইনে কথা বলা, শেখানো আর শেয়ার করা।",
  },
];

function emptyRows(): Designation[] {
  return Array.from({ length: 5 }, () => ({ title: "", description: "" }));
}

function padRows(rows: Designation[]): Designation[] {
  const out = rows.slice(0, 5).map((r) => ({
    title: r.title ?? "",
    description: r.description ?? "",
  }));
  while (out.length < 5) out.push({ title: "", description: "" });
  return out;
}

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [bioLong, setBioLong] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [designations, setDesignations] = useState<Designation[]>(emptyRows());
  const [designationsBn, setDesignationsBn] = useState<Designation[]>(emptyRows());
  const [designationsPrefilled, setDesignationsPrefilled] = useState(false);
  const [savingDesignations, setSavingDesignations] = useState(false);
  const [designationsMessage, setDesignationsMessage] = useState("");

  useEffect(() => {
    Promise.all([getProfile(), getDesignations()])
      .then(([profile, saved]) => {
        setFullName(profile.fullName ?? "");
        setEmail(profile.email ?? "");
        setLocation(profile.location ?? "");
        setPhone(profile.phone ?? "");
        setBioShort(profile.bioShort ?? "");
        setBioLong(profile.bioLong ?? "");
        if (saved.designations.length > 0 || saved.designationsBn.length > 0) {
          setDesignations(padRows(saved.designations));
          setDesignationsBn(padRows(saved.designationsBn));
        } else {
          // Nothing saved yet — show the live copy so the admin edits
          // real values instead of starting from blank rows.
          setDesignations(padRows(LIVE_DESIGNATIONS));
          setDesignationsBn(padRows(LIVE_DESIGNATIONS_BN));
          setDesignationsPrefilled(true);
        }
      })
      .catch(() => setLoadError("Could not load the profile."))
      .finally(() => setLoading(false));
  }, []);

  const setDesignationField = (
    index: number,
    field: "title" | "description",
    value: string,
    bn: boolean,
  ) => {
    const setter = bn ? setDesignationsBn : setDesignations;
    setter((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("");
    try {
      await saveProfile({ fullName, email, location, phone, bioShort, bioLong });
      setProfileMessage("Saved. The public site now uses this profile.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveDesignations = async () => {
    setSavingDesignations(true);
    setDesignationsMessage("");
    try {
      await saveDesignations({ designations, designationsBn });
      setDesignationsPrefilled(false);
      setDesignationsMessage("Saved. The Know Me page now uses these identity cells.");
    } catch (error) {
      setDesignationsMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingDesignations(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <Link href="/dashboard/settings" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        ← Back to Settings
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 4px" }}>
        Profile
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        Your public profile — the name, contact details and identity cells
        the public site shows. The hero portrait is managed separately in{" "}
        <Link href="/dashboard/settings/brand-identity" style={{ color: "var(--brand)" }}>
          Brand / Identity
        </Link>
        .
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loadError && <p style={{ fontSize: 14, color: "var(--accent-danger)" }}>{loadError}</p>}

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Personal details
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Shown on the public site (hero, footer, contact info, JSON-LD).
              Leave a field empty to hide it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mahmudul Hasan Riaz" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@riaz.com.bd" />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dhaka, Bangladesh" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880 …" />
              </div>
              <div>
                <label style={labelStyle}>Short bio</label>
                <Textarea value={bioShort} onChange={(e) => setBioShort(e.target.value)} rows={2} placeholder="One or two lines about you" />
              </div>
              <div>
                <label style={labelStyle}>Long bio</label>
                <Textarea value={bioLong} onChange={(e) => setBioLong(e.target.value)} rows={5} placeholder="The full bio for the Know Me page" />
              </div>
              <div>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save personal details"}
                </Button>
              </div>
              {profileMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{profileMessage}</p>}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Designations — the 5 identity cells
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              The five identities on the Know Me page (and the rotating hero
              badge). Each row is a title + one line. Bangla is a positional
              overlay: row 1 Bangla replaces row 1 English, and so on — an
              empty Bangla row falls back to English.
              {designationsPrefilled && " The rows below are pre-filled with the live site copy — edit and save to keep them."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {designations.map((row, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>
                    Identity {i + 1}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Title (English)</label>
                      <Input value={row.title} onChange={(e) => setDesignationField(i, "title", e.target.value, false)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Description (English)</label>
                      <Input value={row.description ?? ""} onChange={(e) => setDesignationField(i, "description", e.target.value, false)} placeholder="One line about this identity" />
                    </div>
                    <div>
                      <label style={labelStyle}>Title (Bangla) — বাংলা</label>
                      <Input value={designationsBn[i]?.title ?? ""} onChange={(e) => setDesignationField(i, "title", e.target.value, true)} placeholder="বাংলা শিরোনাম (optional — empty shows English)" />
                    </div>
                    <div>
                      <label style={labelStyle}>Description (Bangla) — বাংলা</label>
                      <Input value={designationsBn[i]?.description ?? ""} onChange={(e) => setDesignationField(i, "description", e.target.value, true)} placeholder="বাংলা এক লাইন (optional — empty shows English)" />
                    </div>
                  </div>
                </div>
              ))}
              <div>
                <Button onClick={handleSaveDesignations} disabled={savingDesignations}>
                  {savingDesignations ? "Saving…" : "Save designations"}
                </Button>
              </div>
              {designationsMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{designationsMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
