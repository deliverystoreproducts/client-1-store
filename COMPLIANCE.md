# YB Delivery — California Cannabis Storefront Compliance Spec

> **This is desk research for implementation purposes. It is not legal advice.**
>
> I am not a lawyer. This document was assembled by reading primary California
> statutes and regulations so that a developer can build the storefront against
> something better than folklore. It has three known limits:
>
> 1. **It is state-law only.** Every California cannabis retailer also operates
>    under a *local* licence with its own conditions, and those conditions
>    routinely add website and advertising requirements that no amount of desk
>    research can discover. See [§13](#13-open-questions--needs-a-lawyer).
> 2. **Some questions are genuinely unresolved in the text.** Where that is true
>    I say so rather than picking an answer. A confidently wrong compliance claim
>    is worse than a flagged uncertainty.
> 3. **Cannabis rules change constantly.** Three of the statutes cited here were
>    amended effective 1 January 2026. Everything below was accessed
>    **19 August 2026** and should be re-verified before launch.
>
> **A California cannabis attorney must review this and the finished site before
> launch.** Two of the exposures described here — Prop 65 and the
> §26152.2 public-prosecutor action — are enforced by people who make a living
> filing these claims, not by a regulator who sends a warning letter first.

---

## Contents

1. [How to read this](#1-how-to-read-this)
2. [Summary table](#2-summary-table)
3. [Age verification](#3-age-verification)
4. [Licence disclosure](#4-licence-disclosure)
5. [Mandated warnings — exact copy](#5-mandated-warnings--exact-copy)
6. [Marketing and advertising restrictions](#6-marketing-and-advertising-restrictions)
7. [Delivery-specific rules](#7-delivery-specific-rules)
8. [Required policies and pages](#8-required-policies-and-pages)
9. [Product-page requirements](#9-product-page-requirements)
10. [Placement map](#10-placement-map)
11. [What the operator must supply](#11-what-the-operator-must-supply)
12. [Common practice that is NOT law](#12-common-practice-that-is-not-law)
13. [Open questions / needs a lawyer](#13-open-questions--needs-a-lawyer)
14. [Source register](#14-source-register)

---

## 1. How to read this

| Label | Meaning |
|---|---|
| **MUST** | A statute or regulation requires it. Citation and URL given. |
| **MUST (indirect)** | No rule names the website, but a rule that plainly does apply cannot be satisfied any other way. Reasoning shown so you can judge it. |
| **SHOULD** | Not legally required. Industry standard, risk reduction, or plain good practice. Skipping it is legal. |
| **NOT REQUIRED** | Widely believed to be required, but is not. See [§12](#12-common-practice-that-is-not-law). |

### A numbering correction, because it will save you an hour

The DCC's regulations are **California Code of Regulations, Title 4, Division 19**
(§§ 15000–17999). They are frequently miscited as "Title 4 Division 42."
Division 42 was the *old* Bureau of Cannabis Control division under **Title 16**,
retired when the DCC consolidated the three legacy agencies in 2021. Sections
kept their last three digits and gained a `1` prefix — old 16 CCR §5404 is now
4 CCR §15404. If you are reading a source that says "Title 4 Division 42," it is
splicing the new title onto the old division and may be quoting superseded text.

> **Noted disagreement, unresolved in my favour.** The brief that commissioned
> this document, and a second research pass, both call these rules "Title 4
> Division 42." I have not adopted it. My evidence: the codified section URLs
> resolve under `title-4/division-19/…` — e.g.
> <https://www.law.cornell.edu/regulations/california/title-4/division-19/chapter-3>
> returns the Retailers chapter (§§15400–15427) that every delivery rule cited
> here comes from, and Justia files §15040.2 under
> `title-4/division-19/chapter-1/article-4/`. **This is a citation-form
> disagreement only — the section numbers and substantive text are identical
> either way**, so nothing downstream turns on it. Flagged rather than silently
> harmonised, because a wrong division number sends the next researcher to
> superseded Title 16 text.

### The current regulation text

The DCC's consolidated regulations in force are the version **effective 1 July
2026**:
<https://cdn.cannabis.ca.gov/wp-content/uploads/sites/2/2026/08/dcc_regulations_20260701.pdf>
(accessed 19 Aug 2026). Section text quoted below was taken from Cornell LII's
codified CCR and, for statutes, from leginfo directly.

### The single most important distinction in this document

**Most of the cannabis warning text you have seen on packaging is a *packaging*
requirement, not a *website* requirement.** The "GOVERNMENT WARNING" block, the
universal symbol triangle, batch numbers, THC milligram declarations — these are
imposed by 4 CCR §§ 17403–17408 on the *label of the physical package*. Nothing
in California law ports them onto a retailer's web page.

Conversely, the rules that *do* bind the website — the licence-number rule, the
Prop 65 product-page mechanic, the health-claims rule, the vape-disposal message
— are the ones most often missing from a storefront build, because they are not
visible on any package the builder has ever handled.

---

## 2. Summary table

### 2.1 Hard requirements

| # | Requirement | Where it must appear | Status | Citation |
|---|---|---|---|---|
| 1 | **Licence number**, accurately and legibly identifying the licensee | Every page of the site (it is all "marketing"). Practically: global footer. | **MUST** | B&P §26151(a)(1) — [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26151) |
| 2 | **Prop 65 cannabis warning**, tailored text per consumption route | On the **product display page**, or a link labelled exactly `WARNING` on the product display page; or otherwise prominently pre-purchase. **A footer-only warning fails.** | **MUST** *(unless the sub-10-employee exemption applies — see §5.1)* | 27 CCR §25602(b); §§25607.39/.41/.43/.45 — [§25602](https://www.law.cornell.edu/regulations/california/27-CCR-25602) |
| 3 | **Age affirmation before marketing SMS/email opt-in** | Signup / SMS consent flow | **MUST** | B&P §26151(c); 4 CCR §15041(b),(d) |
| 4 | **No untrue or misleading health claims** | Everywhere — product copy, blog, meta descriptions | **MUST** | B&P §26154 — [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26154) |
| 5 | **Nothing attractive to children**; no image of any person under 21 | Everywhere | **MUST** | B&P §26152(f); 4 CCR §15040(a)(2)–(3) |
| 6 | **No advertising of free cannabis, BOGO-free, contests, sweepstakes, raffles** | Everywhere; and the promotion itself is prohibited | **MUST** | B&P §26153; 4 CCR §15040(a)(4), §15040.2 |
| 7 | **Vape-disposal message**, verbatim | Advertising and marketing of any cartridge / integrated vaporizer — i.e. those product pages | **MUST** | B&P §26152.1 — [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26152.1) |
| 7a | **DCC safer-use brochure displayed prominently, online, at the time of online purchase** | Checkout flow — before order placement | **MUST** *(since 1 Mar 2025; very commonly missed)* | B&P §26070.3(b) — [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26070.3) |
| 8 | **Selling and delivering restricted to 06:00–22:00 Pacific** *(whether out-of-hours order **placement** is permitted is unresolved — §7.1)* | Checkout / delivery scheduling | **MUST** | 4 CCR §15403, §15415(d) — [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15403) |
| 9 | **Daily quantity limits enforced per customer** (28.5 g flower / 8 g concentrate / 6 immature plants, adult-use) | Cart and checkout | **MUST** | 4 CCR §15409 — [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15409) |
| 10 | **Delivery request receipt** with nine mandated data elements | Generated per order; drives the confirmation page and driver app | **MUST** | 4 CCR §15420 — [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15420) |
| 11 | **Cannabis excise tax separately stated** on the receipt | Order confirmation + emailed/printed receipt | **MUST** | Rev. & Tax. Code §34011.2(d) — [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=34011.2) |
| 12 | **Delivery address must be a physical address in California**, not publicly owned land, not a school/daycare/youth center | Address validation at checkout | **MUST** | 4 CCR §15416 — [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15416) |
| 13 | **ID and age verified at the door** before handing over product | Driver flow (not the website, but the site must not promise otherwise) | **MUST** | 4 CCR §15415(g), §15404 |
| 14 | **Conspicuously posted privacy policy** with the mandated content items incl. a Do Not Track disclosure | Footer link, reachable from every page | **MUST** | B&P §22575 (CalOPPA) — [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575) |
| 15 | **No statement inconsistent with the product's own label** | Product pages | **MUST** | B&P §26152(b) |
| 16 | **No cannabis product marketed as beer/wine/liquor/spirits** | Product naming and copy | **MUST** | 4 CCR §15040.1 |

### 2.2 Strongly recommended, not legally mandated

| # | Item | Where | Status | Note |
|---|---|---|---|---|
| 17 | Site-entry **age gate** (21+ self-attestation) | Interstitial before catalogue | **SHOULD (strong)** — see §3.2 | ⚠️ **No California statute or regulation mandates a site-entry age gate.** Indirect basis only: the 71.6 % audience rule *arguably* reaches owned media. Ship it as risk mitigation, and do not cite a regulation for it. The genuine MUST is row 3 (affirmation before signup / list opt-in). |
| 18 | GOVERNMENT WARNING text | Footer and/or PDP | **SHOULD** | A *packaging* rule (4 CCR §17406). Not required on a website. Near-universal practice and cheap goodwill. |
| 19 | THC / CBD content per product | PDP | **SHOULD** | No state mandate for web display. Commercially expected. If shown, §26152(b) requires it to match the label. |
| 20 | Terms of Service | Footer | **SHOULD — possibly MUST, see §13 item 12** | No general law requires one. But **SB 378** (operative 1 Jul 2026) imposes terms-of-service duties on an "online cannabis marketplace," and its definition may reach YB's own site. Unresolved; counsel call. |
| 21 | Link to the DCC licence lookup | Footer | **SHOULD** | Not required. Cheap trust signal: <https://search.cannabis.ca.gov/> |
| 22 | "Keep out of reach of children", "21+ only", impairment/driving notices | Footer | **SHOULD** | Package-label content; voluntary on the web. Keep it *outside* the Prop 65 warning box (27 CCR §25601(e)). |
| 23 | Delivery-area disclosure | Checkout / FAQ | **SHOULD** | Not mandated, but see the local-ban problem in §13. |

---

## 3. Age verification

### 3.1 What the law actually requires at the point of sale

**4 CCR §15404** — the operative rule. Verbatim:

> (a) A licensed retailer shall only sell adult-use cannabis goods to individuals
> 21 years of age or older after verifying the age and identity of the individual
> using valid identification as specified in subsection (c).
>
> (b) A licensed retailer shall only sell medicinal cannabis goods to individuals
> 18 years of age or older after verifying the age, identity, and physician's
> recommendation of the individual as specified in subsection (c).

Acceptable identification, §15404(c), is a closed list of three:

1. A document issued by a federal, state, county, or municipal government
   containing name, date of birth, height, gender and photo — e.g. a driver's
   licence.
2. A valid identification card issued to a member of the Armed Forces with name,
   date of birth and photo.
3. A valid passport issued by the United States or by a foreign government.

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15404> (accessed 19 Aug 2026)

**This verification happens at the door, in person, by the delivery employee** —
not on the website. 4 CCR §15415(g):

> Prior to providing cannabis goods to a delivery customer, a delivery employee
> shall confirm the identity and age of the delivery customer as required by
> section 15404 …

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15415> (accessed 19 Aug 2026)

**Implication for the build:** the website is *not* the compliance boundary for
age. The driver is. The site must never create an expectation that ID will not
be checked, and the checkout flow should tell the customer plainly that a
physical, unexpired, government-issued photo ID matching the order name will be
required at handover, and that the driver cannot complete the delivery without it.

> ⚠️ **Online age affirmation does NOT satisfy §15404, and cannot be built to.**
> These are **two separate, non-substitutable controls**:
>
> | Control | Where | Standard | Authority |
> |---|---|---|---|
> | Age **affirmation** | Website | Self-attestation — a click is enough | B&P §26151(c), 4 CCR §15041 |
> | Age + identity **verification** | At the door | **Physical inspection** of one of the three documents in §15404(c) | 4 CCR §15404, §15415(g) |
>
> No amount of online ID upload, scan, or third-party verification discharges
> §15404 — the regulation contemplates the delivery employee inspecting the
> document at handover. Collecting ID images at signup is therefore **optional
> extra risk**, not compliance: it creates a sensitive-data store that buys YB
> nothing legally. If YB wants it for fraud control, that is a business decision
> to be taken with eyes open, and it needs a retention policy.

**Medical (18+) is a genuine product decision, not a default.** Serving 18–20 yo
medicinal patients requires verifying a physician's recommendation, and
medicinal orders carry different daily limits (§15409(b)), different potency
ceilings, and a sales-tax exemption for MMIC holders. If YB is adult-use only,
say so explicitly on the site and hard-code 21 as the floor. Do not build a
half-implemented medical path.

### 3.2 The website age gate — honest assessment

**There is no California statute or regulation that requires a cannabis
retailer's website to show an age gate before displaying products.** I looked
specifically for one. B&P §§26150–26156 contain the word "internet" exactly
once, in §26151(a)(2), and it is about licence numbers, not age.

What *does* exist:

**(a) A hard requirement for direct, individualised communication.**
B&P §26151(c), verbatim:

> Any advertising or marketing involving direct, individualized communication or
> dialogue controlled by the licensee shall utilize a method of age affirmation
> to verify that the recipient is 21 years of age or older before engaging in
> that communication or dialogue controlled by the licensee. For purposes of this
> section, that method of age affirmation may include user confirmation, birth
> date disclosure, or other similar registration method.

The implementing regulation, **4 CCR §15041**, makes the scope explicit:

> (b) For the purposes of this section, direct, individualized communication or
> dialogue may occur through any form of communication, including in-person,
> telephone, physical mail, or electronic.
>
> (d) A licensee shall use a method of age affirmation before having a potential
> customer added to a mailing list, subscribe, or otherwise consent to receiving
> direct, individualized communication or dialogue controlled by a licensee.

> (c) A method of age verification is not necessary for a communication if the
> licensee can verify that the licensee has previously had the intended recipient
> undergo a method of age affirmation and the licensee is reasonably certain that
> the communication will only be received by the intended recipient.

**This is a real MUST and it bites YB directly**, because YB intends to send SMS.
Age-affirm *before* the phone number goes on a marketing list, and persist that
affirmation against the customer record so §15041(c) covers later sends.

**(b) A contested argument for gating the whole site.**
B&P §26151(b) requires advertising or marketing "placed in broadcast, cable,
radio, print, and digital communications" to be displayed only where ≥ 71.6 % of
the audience is reasonably expected to be 21+. "Marketing" is defined at
§26150(e) as "any act or process of promoting or selling," which plainly covers
an e-commerce menu.

The counter-argument is that §26151(b) and 4 CCR §15040 are written around
*placement*: the licensee must obtain "reliable up-to-date audience composition
data," produce it to the DCC on request, and "remove the advertising or marketing
placement" if it does not comply. That machinery describes buying media, and a
licensee's own site has no third-party audience data to obtain.

**Neither reading is settled and no text resolves it.** But note the practical
asymmetry: if the rule *does* reach owned media, an age gate is the only
mechanism by which YB could ever claim a reasonable expectation that its site
audience is 21+. The gate costs nothing and is universal in the industry.

**Recommendation: keep the gate. Classify it internally as risk mitigation, not
as a cited statutory mandate** — so that nobody later "discovers" it is
unnecessary and removes it, and so that nobody cites a fake regulation for it in
a licence application.

### 3.3 Gate mechanics

Self-attestation is sufficient. §26151(c) expressly permits "user confirmation,
birth date disclosure, or other similar registration method." **No California law
requires document/ID verification to browse or to place an online cannabis
order.** Anyone selling YB an "age verification API" as a legal requirement for
the storefront is selling a nice-to-have.

The existing `AgeGate` component (a "Yes, I'm 21+" confirmation, decided
server-side from a cookie before the catalogue renders) satisfies the
"user confirmation" method and is architecturally correct — the catalogue is
never sent to an unaffirmed visitor.

Two changes worth making:

- **Log the affirmation against the account** once the user signs in, with a
  timestamp, so §15041(c) can be relied on for subsequent SMS.
- **Do not use a birth-date picker unless you intend to store it.** Collecting a
  DOB you discard is worse than a click: it is extra personal data with no
  compliance benefit.

---

## 4. Licence disclosure

### 4.1 The requirement

**B&P §26151(a)(1)**, verbatim:

> All advertisements and marketing shall accurately and legibly identify the
> licensee responsible for its content, by adding, at a minimum, the licensee's
> license number.

Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26151> (accessed 19 Aug 2026)

**Does this cover YB's own website? Yes.** Two definitions in §26150 both catch it:

> (b) "Advertisement" includes any written or verbal statement, illustration, or
> depiction which is calculated to induce sales of cannabis or cannabis products,
> including any written, printed, graphic, or other material … **or in any other
> media**; except that such term shall not include: (1) [labels] … (2) [unpaid
> editorial not written by or at the direction of the licensee].

> (e) "Market" or "Marketing" means **any act or process of promoting or selling**
> cannabis or cannabis products …

An e-commerce menu is "calculated to induce sales," is an "act or process of
promoting or selling," and neither exclusion applies. This one is not
ambiguous — unlike the 71.6 % question, the licence-number duty on the website is
solid.

### 4.2 Format

**The statute prescribes no format, size, or placement.** The only qualifiers are
"accurately and legibly." There is no required prefix, no minimum point size, no
mandated header-vs-footer position. "At a minimum" means the licence number is
the floor — more identifying information is permitted and is a good idea.

Do **not** confuse this with 4 CCR §15039(d), which *does* specify dimensions
(certificate ≥ 8.5" × 11", QR code ≥ 3.75" × 3.75"). That is the **physical
premises** QR-code posting rule and has nothing to do with a website.

### 4.3 Recommended implementation

Because "all advertisements and marketing" is unqualified, put it in the global
footer so it renders on every route, including the age gate.

```
YB Delivery, LLC · DCC Licence No. C9-0000000-LIC
Licensed non-storefront retailer · Verify at search.cannabis.ca.gov
```

- Real text, not an image — "legibly" plus it must survive screen readers.
- Present on the age gate too. The gate is itself marketing.
- Same treatment in SMS marketing, email footers, and any social profile.

### 4.4 Licence lookup link — NOT REQUIRED

No regulation requires linking to the DCC verification tool. It is a free trust
signal and takes one line, so it is a **SHOULD**:
<https://search.cannabis.ca.gov/>

---

## 5. Mandated warnings — exact copy

### 5.1 Proposition 65 — the real website requirement

This is the warning obligation that genuinely attaches to the **web page**, and
it is the one most often built wrong.

#### First: does YB have a Prop 65 duty at all?

**Health & Safety Code §25249.11(b)**, verbatim:

> "Person in the course of doing business" does not include any person employing
> fewer than 10 employees in his or her business …

Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=25249.11> (accessed 19 Aug 2026)

**If YB employs fewer than 10 people, Prop 65's warning duty does not apply to
YB.** This is a real and commonly overlooked exemption. It is also fragile: it
tracks the business, not the product, and a delivery retailer that is hiring
drivers can cross the line without noticing.

**Recommendation:** build the Prop 65 warning capability regardless, and gate it
behind a config flag. Growing past nine employees should not require a code
change. Have counsel confirm how the employee count is measured — it is not
obviously a headcount-at-an-instant test, and if YB is near the line that is a
lawyer question, not a developer question.

#### Cannabis has its own warning text — the generic one is wrong

California adopted **cannabis-specific tailored safe-harbour warnings** at
27 CCR §§25607.38–25607.47, effective **1 October 2022**. These displace the
generic §25603 wording for cannabis products, **and the short-form warning is not
available for cannabis**. Pasting the familiar "This product can expose you to
chemicals including…" text onto a cannabis product page puts YB outside the safe
harbour.

#### Placement mechanics — 27 CCR §25602(b), verbatim

> (1) For internet purchases, a warning meets the requirements of this subarticle
> if it complies with the content requirements of Section 25603 and the warning
> must also be provided using one or more of the following methods:
>
> (A) a warning on the product display page, or
>
> (B) a clearly marked hyperlink using the word "WARNING" or the words
> "CA WARNING" or "CALIFORNIA WARNING" on the product display page that links to
> the warning, or
>
> (C) an otherwise prominently displayed warning provided to the purchaser prior
> to completing the purchase. … For purposes of this subsection, the warning is
> not prominently displayed if the purchaser must search for it in the general
> content of the website.

Source: <https://www.law.cornell.edu/regulations/california/27-CCR-25602> (accessed 19 Aug 2026)

> **How the two rule-sets fit together.** §25602(b) refers to the *generic*
> content section (§25603), but for cannabis the content comes from the tailored
> sections instead. Each tailored section points back to §25602 for **methods**
> while supplying its own **content** — e.g. §25607.38(a): a warning for smoked
> cannabis complies "if it complies with the content requirements in Section
> 25607.39 and is provided using one or more of the methods required in Section
> 25602, not including subsection (a)(4)."
>
> So: **methods from §25602(b)** (the internet mechanic above), **words from
> §25607.39 / .41 / .43 / .45** (below). The excluded §25602(a)(4) is the
> on-product short-form label method, which is why short-form is unavailable for
> cannabis.

**Three consequences the build must respect:**

1. **A site-wide footer warning does not satisfy this.** The regulation expressly
   forecloses it: not prominent if "the purchaser must search for it in the
   general content of the website."
2. **If you use a link instead of inline text, the link text must be exactly
   `WARNING`, `CA WARNING`, or `CALIFORNIA WARNING`.** A link reading "Prop 65",
   "Legal", or "Learn more" is outside the safe harbour.
3. **It must be on the product display page**, or otherwise shown before the
   purchase completes.

#### The exact copy — use verbatim

Every warning below is preceded by (i) the yellow-triangle symbol and (ii) the
word **`WARNING:`** in capitals and bold. Note the URL carries the **`/cannabis`**
path — this differs from the generic Prop 65 URL.

**Symbol spec, 27 CCR §25603(a)(1), verbatim:**

> A symbol consisting of a black exclamation point in a yellow equilateral
> triangle with a bold black outline. Where the sign, label or shelf tag for the
> product is not printed using the color yellow, the symbol may be printed in
> black and white. The symbol shall be placed to the left of the text of the
> warning, in a size no smaller than the height of the word "WARNING".

---

**Smoked products — flower, prerolls.** 27 CCR §25607.39(a)(3):

```
WARNING: Smoking cannabis increases your cancer risk and during pregnancy
exposes your child to delta-9-THC and other chemicals that can affect your
child's birthweight, behavior, and learning ability. For more information go to
www.P65Warnings.ca.gov/cannabis.
```

**Ingested products — edibles, beverages, tinctures, capsules.** 27 CCR §25607.41(a)(3)(A):

```
WARNING: Consuming this product during pregnancy exposes your child to
delta-9-THC, which can affect your child's behavior and learning ability. For
more information go to www.P65Warnings.ca.gov/cannabis
```

**Vaped or dabbed products — cartridges, concentrates.** 27 CCR §25607.43(a)(3)(A):

```
WARNING: Vaping or dabbing this product during pregnancy exposes your child to
delta-9-THC, which can affect your child's behavior and learning ability. For
more information go to www.P65Warnings.ca.gov/cannabis.
```

**Dermal / topical products.** 27 CCR §25607.45(a)(3)(A):

```
WARNING: Using this product during pregnancy exposes your child to delta-9-THC,
which can affect your child's behavior and learning ability. For more
information go to www.P65Warnings.ca.gov/cannabis.
```

Each of the ingested / vaped / dermal sections has a second variant for products
that also expose the consumer to a listed **carcinogen**, e.g. §25607.41(a)(3)(B):

```
WARNING: Consuming this product exposes you to carcinogens including [name one
or more listed carcinogens], and during pregnancy exposes your child to
delta-9-THC, which can affect your child's behavior and learning ability. For
more information go to www.P65Warnings.ca.gov/cannabis.
```

Where only one carcinogen is involved you may write "the carcinogen" instead of
"carcinogens including" (§25603(a)(2)(E)).

> **Punctuation note.** The ingested variant ends without a full stop in OEHHA's
> official text, unlike its siblings. Reproduced as printed. Immaterial either
> way.

> **Signal word.** The cannabis sections were adopted in 2022 and specify only
> *"The word 'WARNING:' in all capital letters and bold print."* They do **not**
> offer the "CA WARNING:" / "CALIFORNIA WARNING:" alternatives that a 2024
> amendment added to the generic §25603(a)(2). The §25602(b)(1)(B) *hyperlink*
> may still use any of the three, since the cannabis sections incorporate
> §25602's methods. There is mild tension between the two provisions —
> **use plain `WARNING` for both the inline text and any link** and the tension
> disappears.

#### Is the wording mandated word-for-word?

**Strictly, no — but treat it as if it were.** 27 CCR §25600(f):

> Nothing in Subarticle 2 shall be construed to preclude a person from providing
> a warning using content or methods other than those specified in Subarticle 2
> that nevertheless complies with Section 25249.6 of the Act.

The statute (HSC §25249.6) requires only a "clear and reasonable warning." The
regulations are a **deemed-compliant safe harbour**, not mandated wording.
Deviating is not automatically unlawful — but it forfeits the presumption and
shifts the burden onto YB to *prove* its wording was clear and reasonable,
against a private plaintiffs' bar that files thousands of 60-day notices a year.
There is no upside to deviating. **Ship it verbatim.**

#### Suggested data model

Add a `consumptionRoute` enum to each product: `smoked | ingested | vaped_dabbed
| dermal`, plus an optional `listedCarcinogens: string[]`. Map the enum to the
four strings above; if `listedCarcinogens` is non-empty, select the `(B)` variant
and interpolate. Render the triangle as inline SVG so it scales and survives
dark mode. Do not let marketing copy leak inside the warning container —
27 CCR §25601(e) limits supplemental content in the warning itself.

### 5.2 The GOVERNMENT WARNING — a package rule, not a website rule

This is the text everyone recognises, and it is **not required on a website**.
It is imposed by 4 CCR Division 19 Chapter 11 (Labeling and Packaging) on the
*physical package*. No statute or regulation ports it onto advertising or a web
page.

**There are two versions, not one** — a distinction almost always lost when this
text is copied onto websites.

**Manufactured products** (edibles, cartridges, tinctures, topicals) —
4 CCR §17406(a)(3), informational panel, "in bold print":

```
GOVERNMENT WARNING: THIS PRODUCT CONTAINS CANNABIS, A SCHEDULE I CONTROLLED
SUBSTANCE. KEEP OUT OF REACH OF CHILDREN AND ANIMALS. CANNABIS PRODUCTS MAY ONLY
BE POSSESSED OR CONSUMED BY PERSONS 21 YEARS OF AGE OR OLDER UNLESS THE PERSON IS
A QUALIFIED PATIENT. THE INTOXICATING EFFECTS OF CANNABIS PRODUCTS MAY BE DELAYED
UP TO TWO HOURS. CANNABIS USE WHILE PREGNANT OR BREASTFEEDING MAY BE HARMFUL.
CONSUMPTION OF CANNABIS PRODUCTS IMPAIRS YOUR ABILITY TO DRIVE AND OPERATE
MACHINERY. PLEASE USE EXTREME CAUTION.
```

**Nonmanufactured goods** (flower, prerolls) — 4 CCR §17403(b)(4). Note the
differences: **"THIS PACKAGE"** not "THIS PRODUCT", **"CANNABIS"** not "CANNABIS
PRODUCTS", and **no two-hour delayed-onset sentence**:

```
GOVERNMENT WARNING: THIS PACKAGE CONTAINS CANNABIS, A SCHEDULE I CONTROLLED
SUBSTANCE. KEEP OUT OF REACH OF CHILDREN AND ANIMALS. CANNABIS MAY ONLY BE
POSSESSED OR CONSUMED BY PERSONS 21 YEARS OF AGE OR OLDER UNLESS THE PERSON IS A
QUALIFIED PATIENT. CANNABIS USE WHILE PREGNANT OR BREASTFEEDING MAY BE HARMFUL.
CONSUMPTION OF CANNABIS IMPAIRS YOUR ABILITY TO DRIVE AND OPERATE MACHINERY.
PLEASE USE EXTREME CAUTION.
```

Statutory twin at B&P §26120(c)(1)(A)/(B). On the package the wording is
**mandated word-for-word** ("*the following statement*"), in bold, type size no
smaller than 6 point.

Source: 4 CCR §17406, §17403; DCC labelling guidance, <https://www.cannabis.ca.gov/licensees/cannaconnect-compliance-hub/labeling/manufactured-final-form/> (accessed 19 Aug 2026).

**Status on the website: SHOULD.** Displaying it in the footer is near-universal
industry practice, costs nothing, and reinforces the 21+ message. It is not a
legal requirement and YB should not be told that it is. If you do show it,
either use the manufactured-product version generically or select per product
type — do not invent a hybrid.

> **No mental-health warning is currently required.** SB 540 (2023) directed the
> DCC to adopt updated label warnings reflecting evolving science by 1 July 2025
> (B&P §26121). **That deadline passed without a rulemaking** — the labelling
> provisions are unchanged in both the January and July 2026 editions of the
> regulations. Any vendor telling YB it needs a psychosis or mental-health label
> warning today is wrong. What SB 540 *did* impose on retailers is the brochure
> duty in §5.4 below, which is a genuine and current obligation.

If you do display it, reproduce it accurately — a garbled version of a statutory
warning is a worse look than no version at all, and an inaccurate rendering of
label content brushes against B&P §26152(b) (no advertising statement
inconsistent with the label).

### 5.3 Vape disposal message — verbatim, and genuinely required in marketing

**This is a real advertising requirement and is very frequently missed**, because
unlike the other warnings it was created recently and applies to *advertising and
marketing*, not packaging.

**B&P §26152.1**, verbatim:

> (a)(1) Advertisement and marketing of an integrated cannabis vaporizer, as
> defined in Section 26122, shall prominently provide in a clear and legible
> fashion: "An empty integrated cannabis vaporizer shall be properly disposed of
> as hazardous waste at a household hazardous waste collection facility or other
> approved facility."
>
> (a)(2) Advertisement and marketing of a cannabis cartridge shall prominently
> provide in a clear and legible fashion: "A spent cannabis cartridge shall be
> properly disposed of as hazardous waste at a household hazardous waste
> collection facility or other approved facility."
>
> (b) Advertisement and marketing of a cannabis cartridge and an integrated
> cannabis vaporizer shall not indicate that a cannabis cartridge or an
> integrated cannabis vaporizer is disposable nor imply that it may be thrown in
> the trash or recycling streams.
>
> (c) This section shall become operative on July 1, 2024.

Added by Stats. 2022, Ch. 390 (AB 1894); operative 1 July 2024.
Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26152.1> (accessed 19 Aug 2026)

**Copy to use — integrated vaporizers:**

```
An empty integrated cannabis vaporizer shall be properly disposed of as
hazardous waste at a household hazardous waste collection facility or other
approved facility.
```

**Copy to use — cartridges:**

```
A spent cannabis cartridge shall be properly disposed of as hazardous waste at a
household hazardous waste collection facility or other approved facility.
```

> **Watch out:** the DCC's own summary web page drops the word "collection" from
> the cartridge version. The **statute** says "household hazardous waste
> collection facility" in *both* messages, and the statute controls. Use the
> text above.

**Wording is mandated verbatim** — the statute quotes the sentences directly.

**Placement:** these must appear wherever the vape product is advertised or
marketed. On a storefront that means the **product detail page** for every
cartridge and integrated vaporizer SKU, and any category page or promotional
tile that markets one. A single footer line will not obviously satisfy
"prominently … in a clear and legible fashion" attached to the product being
advertised — put it on the PDP.

**Also (b):** never describe these products as "disposable," "throwaway", or
"recyclable" anywhere in product copy. Check supplier-provided product
descriptions, which often use exactly this language.

### 5.4 The SB 540 safer-use brochure — a real online requirement

**This is the most commonly missed website obligation in California cannabis
retail**, because it lives in the statute only and is mirrored nowhere in the DCC
regulations — so a regulations-only compliance review misses it entirely.

**B&P §26070.3(b)**, verbatim:

> On and after March 1, 2025, a retailer or microbusiness selling, or person
> delivering, cannabis or cannabis products to a consumer shall prominently
> display the brochure, including printed copies, at the point of sale or final
> delivery in person **and online at time of online purchases**, and offer each
> new consumer a copy of the brochure created pursuant to subdivision (a) at the
> time of first purchase or delivery.

Added by Stats. 2023, Ch. 491 (SB 540), effective 1 January 2024; display duty
operative **1 March 2025**.
Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26070.3> (accessed 19 Aug 2026)

The brochure is produced by the DCC under §26070.3(a) and covers the
pharmacological effects of cannabis, the risks of high-potency products, mental
health effects of THC, use by minors, and use while pregnant or breastfeeding.
Statutory minimum type size is 12 point.

**Official DCC brochure PDFs** (accessed 19 Aug 2026):
- <https://cdn.cannabis.ca.gov/wp-content/uploads/sites/2/2024/12/SB-540-color.pdf>
- <https://cdn.cannabis.ca.gov/wp-content/uploads/sites/2/2024/12/SB-540-BW.pdf>

> **Caveat:** the DCC's own SB 540 landing page currently 404s; the brochure PDFs
> still resolve on the CDN host. Confirm YB is serving the current version before
> launch, and re-check periodically — §26070.3 requires the DCC to recertify or
> update the brochure by 1 January 2030 and every five years after.

**Three distinct duties in one sentence** — the build must satisfy all three:

1. **"Prominently display … online at time of online purchases."** The brochure
   must be surfaced *during* the purchase flow, not merely linked from the
   footer. "Prominently" and "at time of … purchase" both point at checkout.
2. **"Including printed copies … at the point of sale or final delivery."** The
   driver must carry physical copies. This is an operations task, not a website
   task, but it belongs in the driver runbook.
3. **"Offer each new consumer a copy … at the time of first purchase."** Requires
   tracking whether a customer is new. The account record needs a
   `brochureOfferedAt` field.

**Recommended implementation:** embed or prominently link the brochure on the
`/checkout` page above the place-order control — not behind an accordion, not in
the footer — and record acknowledgement on the order. For a first-time customer,
present it as an explicit offer rather than a passive link, and store the
timestamp.

**Wording:** the brochure content is the DCC's and must be reproduced as issued —
do not paraphrase or re-typeset it into site copy. Serve the DCC PDF, or an
accessible HTML rendering that is faithful to it.

### 5.5 Universal symbol — package only

The black triangle with an exclamation point and cannabis leaf, with "CA"
beneath, is a **packaging** requirement (4 CCR §17410 — black or white, on a
contrasting colour, no smaller than 0.5 inch high, or 0.25 inch for vape
cartridges and integrated vaporizers). It is required on the package's primary
panel. It is **not** required on a website, and reproducing it next to a product
image is not a substitute for anything. Harmless to show; not a compliance item.

---

## 6. Marketing and advertising restrictions

Every rule in this section applies to the whole site, because the whole site is
"marketing" under §26150(e).

### 6.1 The 71.6 % audience rule

**B&P §26151(b)**, verbatim:

> Any advertising or marketing placed in broadcast, cable, radio, print, and
> digital communications shall only be displayed where at least 71.6 percent of
> the audience is reasonably expected to be 21 years of age or older, as
> determined by reliable, up-to-date audience composition data.

**4 CCR §15040(a)(1)** adds the evidentiary precondition:

> Shall only be displayed after a licensee has obtained reliable up-to-date
> audience composition data demonstrating that at least 71.6 percent of the
> audience viewing the advertising or marketing is reasonably expected to be 21
> years of age or older;

with §15040(d)–(e) requiring the licensee to produce that data to the DCC on
request and to **remove the placement** if it does not comply.

**Where this genuinely bites: paid media.** Before YB buys any advertising —
Google, programmatic, podcast, print, a delivery-app placement — it must obtain
and retain audience composition data showing ≥ 71.6 % 21+. §15040(c) expressly
excludes census data and Department of Finance population estimates from
qualifying. Keep the data on file; the DCC can demand it "immediately upon
request."

**Vicarious liability**, §15040(f):

> In construing and enforcing the advertising provisions of the Act and this
> division, any action, omission, or failure of an advertising agent,
> representative, or contractor retained by the licensee shall in every case be
> deemed the act, omission, or failure of the licensee.

If YB hires an agency and the agency places a non-compliant ad, that is YB's
violation. Put the compliance obligations in the agency contract.

**Whether it reaches YB's own site is unresolved** — see §3.2.

### 6.2 Attractive to minors

**B&P §26152(f)** prohibits advertising or marketing "that is attractive to
children." **4 CCR §15040(a)(2)–(3)** gives the operative content list for
advertising:

> (2) Shall not use any depictions or images of minors or anyone under 21 years
> of age;
>
> (3) Shall not use any images that are attractive to children, including, but
> not limited to:
> (A) Cartoons;
> (B) Any likeness to images, characters, or phrases that are popularly used to
> advertise to children;
> (C) Any imitation of candy packaging or labeling; or
> (D) The terms "candy" or "candies" or variants in spelling such as "kandy" or
> "kandeez."

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15040> (accessed 19 Aug 2026)

**Build checklist:**

- No cartoon or mascot illustration anywhere — including 404 pages, loading
  states, empty-cart illustrations, and email templates. This is where cartoons
  survive a design review.
- **No image of any person who is or appears to be under 21** — in *any* role.
  The rule is not limited to depictions of consumption; a lifestyle photo with a
  teenager in the background violates it.
- Never use "candy" or "candies," or spelling variants, in product names,
  category names, URL slugs, alt text, or meta descriptions. Note that supplier
  product names sometimes contain these words — sanitise the catalogue import.
- No packaging imagery that imitates a mainstream confectionery brand.

**B&P §26152(e)** separately prohibits marketing "in a manner intended to
encourage persons under 21 years of age to consume."

### 6.3 Health claims

**B&P §26154**, verbatim:

> A licensee shall not include on the label of any cannabis or cannabis product
> or publish or disseminate advertising or marketing containing any health-related
> statement that is untrue in any particular manner or tends to create a
> misleading impression as to the effects on health of cannabis consumption.

Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26154> (accessed 19 Aug 2026)

"Health-related statement" is defined broadly at §26150(d):

> any statement related to health, and includes statements of a curative or
> therapeutic nature that, expressly or by implication, suggest a relationship
> between the consumption of cannabis or cannabis products and health benefits,
> or effects on health.

Reinforced by **§26151(d)**: "All advertising shall be truthful and appropriately
substantiated," and **§26152(a)** (nothing that "tends to create a misleading
impression").

**Practical rule for product copy:** describe *the product*, not *what it will do
to the customer's body*. "Helps with anxiety," "relieves pain," "aids sleep,"
"anti-inflammatory," "boosts immunity" are all health-related statements
requiring substantiation YB does not have. Strain-effect language ("relaxing,"
"uplifting") is the industry norm and is a grey zone — closer to a health claim
the more clinical it sounds. Have counsel set the line, and apply it to
supplier-supplied descriptions, which are the usual source of this problem.

### 6.4 Free product, giveaways, and promotions

**B&P §26153(a)**, verbatim:

> A licensee shall not give away any amount of cannabis or cannabis products, or
> any cannabis accessories, as part of a business promotion or other commercial
> activity.

**4 CCR §15040.2** (the conduct):

> (a) A licensee shall not give away any amount of cannabis or cannabis products,
> or any cannabis accessory, as part of a business promotion.
>
> (b) A licensee shall not hold a raffle or sweepstakes as part of a business
> promotion.

**4 CCR §15040(a)(4)** (advertising it):

> (4) Shall not advertise free cannabis goods or cannabis accessories. This
> includes promotions such as:
> (A) Buy one product, get one product free;
> (B) Free product with any donation; and
> (C) Contests, sweepstakes, or raffles.

**The line the developer needs:**

| Promotion | Legal? |
|---|---|
| "20 % off flower" | **Yes.** §26153 bans *giving away*, not discounting. No price/discount language appears anywhere in Chapter 15. |
| "Buy one, get one 50 % off" | **Yes.** A discount. |
| "Buy one, get one **free**" | **No.** §15040(a)(4)(A) by name. |
| "Free preroll with orders over $100" | **No.** Giveaway. |
| "Free lighter / free grinder with purchase" | **No.** §26153(a) expressly covers *cannabis accessories*. |
| Sweepstakes, raffle, contest with any prize | **No.** §15040.2(b) and §15040(a)(4)(C). |
| Loyalty points redeemable for a discount | **Probably yes** — it is a discount mechanism. Have counsel confirm. |
| Loyalty points redeemable for **free product** | **No.** That is a giveaway with extra steps. |
| Free delivery / waived delivery fee | **Probably yes** — not cannabis, not an accessory. Confirm with counsel. |

**Do not build a sweepstakes, referral-prize, or "spin to win" module.** If the
promotions engine supports percentage and fixed-amount discounts only, the site
cannot easily be configured into a violation by a marketer later. That is the
right architectural constraint.

### 6.5 Other restrictions worth knowing

- **§26152(b)** — no advertising statement inconsistent with the product's own
  label. This governs THC percentages, weights, and strain names on the PDP: they
  must match the label.
- **4 CCR §15040.1** — cannabis goods must not be marketed, advertised or sold
  labelled as "beer, wine, liquor, spirits, or any other term used to describe a
  type of alcohol." Relevant if YB stocks THC beverages; check category naming
  ("cannabis wine," "weed beer" are out).
- **§26152(g)** — the 1,000-foot rule around schools, daycares, playgrounds and
  youth centres applies to an **"advertising sign,"** defined at §26150(c) as a
  "stationary or permanently affixed" advertisement. **A web page is not an
  advertising sign; this does not touch web content.** It would apply to any
  physical signage.
- **§26152(d)** — billboards on interstate highways or state highways crossing
  the California border. Not a web issue.
- **§26152(h)** — no advertising for unlicensed activity, or while a licence is
  suspended. **Operational consequence: if YB's licence is ever suspended, the
  storefront must go dark.** Build a global kill switch. The existing
  `/unavailable` route and `StoreUnavailable` component are the right hook —
  make sure the switch is operable without a deploy.

### 6.6 Enforcement — why this is not merely theoretical

**B&P §26152.2** (amended by AB 1170, effective 1 January 2026) lets the
**Attorney General, a city attorney, or a county counsel** sue directly to redress
violations of §26152(d), (e), (f) and (g), with injunctive relief mandatory for a
prevailing plaintiff, plus attorney's fees and civil penalties of **up to $5,000
per violation** for a licensed business (up to $30,000 for unlicensed).

Note the scope: this public-prosecutor route reaches the *attractive-to-children*
and *encouraging-under-21* prohibitions — the two most likely to be tripped by a
design choice. It does **not** reach §26151 (licence number, 71.6 %, age
affirmation) or §26152(a)/(b)/(h), which remain DCC-enforced.

---

## 7. Delivery-specific rules

YB is a **non-storefront retailer** (4 CCR §15414): authorised to conduct retail
sales exclusively by delivery, and its licensed premises "shall be closed to the
public."

### 7.1 Hours — a hard constraint on the checkout

**4 CCR §15403**, verbatim and complete:

> A licensed retailer shall sell and deliver cannabis goods only between the
> hours of 6:00 a.m. Pacific Time and 10:00 p.m. Pacific Time.

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15403> (accessed 19 Aug 2026)

The rule covers **both** selling and delivering. Reinforced by §15415(d):
"Deliveries of cannabis goods shall be received by customers only during the
hours of operation established by section 15403."

**Build implications:**

- Compute the window in **`America/Los_Angeles`**, never in UTC or the browser's
  local zone. A customer in another timezone must still be bound by Pacific time.
  This is a real bug class: a naive `new Date().getHours()` on a UTC server
  silently sells at 3 a.m. Pacific.
- Handle the DST transitions; the window is defined in Pacific *Time*, which
  shifts.
- Show the customer the next available ordering window rather than a bare error.

> **Unresolved: is *placing* an order at 23:00 for 10:00 delivery lawful?**
> §15403 restricts the **sale** and the **delivery**, and §15415(d) restricts
> **receipt** by the customer. None of them says when a *request* may be
> submitted, and I found no DCC guidance resolving it. A defensible reading is
> that the "sale" completes at handover, so an out-of-hours order queued for
> in-hours delivery is fine; an equally defensible reading is that accepting
> payment and forming the contract at 23:00 *is* the sale.
>
> **Earlier drafts of this document asserted the conservative reading as
> settled. That was an overstatement and has been corrected.**
>
> **Build recommendation: make it configurable** — a
> `allowOutOfHoursOrderPlacement` flag, defaulting to **off** (block placement
> outside 06:00–22:00 PT). Defaulting closed is the safe posture, and the flag
> means a legal opinion can change the behaviour without a code change. Ask
> counsel; this is a revenue question worth an hour of their time, since
> overnight order capture is material for a delivery business.

### 7.2 Daily quantity limits — enforce in the cart

**4 CCR §15409.** A retailer shall not sell more than the following in a single
day to a single **adult-use** customer:

| Category | Adult-use limit |
|---|---|
| Non-concentrated cannabis | **28.5 g** |
| Cannabis concentrate (incl. concentrate contained in manufactured products) | **8 g** |
| Immature cannabis plants | **6** |

Medicinal patients (§15409(b)): **8 oz** of dried mature flower and **12**
immature plants, subject to a physician's recommendation for a different amount
under §15409(c).

§15409(d): the adult-use and medicinal limits **shall not be combined**.
§15409(e): the retailer is responsible for verifying that manufactured products
comply with the concentrate limit.

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15409> (accessed 19 Aug 2026)

**Build implications:**

- Every product needs a `netWeightGrams` and a `concentrateEquivalentGrams`. The
  8 g concentrate limit counts concentrate *inside manufactured products* — the
  THC in an edible or a cartridge counts toward it, which is the part
  implementations get wrong.
- Enforce at **add-to-cart** and re-validate at **checkout**.
- The limit is **per customer per day**, not per order. A customer placing a
  second order the same day must be checked against the first. Enforce
  server-side against order history keyed to the customer, not to a session or a
  cart.

> ⚠️ **The definition of "cannabis concentrate" is time-staged and moves again on
> 1 January 2028.** The 8 g limit is only as stable as the category underneath
> it, and that category is now defined by **Health & Safety Code §11006.5**,
> rewritten by AB 8 (Stats. 2025, Ch. 248, §23):
>
> | Operative period | Definition |
> |---|---|
> | Before 1 Jan 2026 | "the separated resin, whether crude or purified, obtained from cannabis" |
> | **1 Jan 2026 – 31 Dec 2027** | "cannabis that has undergone a process to concentrate one or more active cannabinoids, thereby increasing potency, and includes extracts, oils, hash, dab, shatter, rosin, wax, and the separated resin, whether crude or purified" |
> | **From 1 Jan 2028** | as above, but extended to "cannabis **or industrial hemp**", and expressly **excluding CBD isolate** as defined in B&P §26001 |
>
> Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11006.5> (accessed 19 Aug 2026)
>
> **Do not hardcode a product-category list.** The 2026 rewrite widened the
> category well beyond "separated resin" — rosin, wax and shatter are now named
> explicitly. Model concentrate classification as a **dated rule** evaluated
> against the order date, exactly as you would a tax rate, and put a calendar
> reminder on 1 January 2028. A catalogue classified under the pre-2026
> definition will under-count concentrate and silently oversell past the 8 g
> limit.

### 7.3 Where YB may deliver

**4 CCR §15416:**

> (a) A delivery employee may only deliver cannabis goods to a physical address
> in California.

> (d) A delivery employee may deliver to any jurisdiction within the State of
> California provided that such delivery is conducted in compliance with all
> delivery provisions of this division.

§15416(b) prohibits leaving California while in possession of cannabis goods.
§15416(c) prohibits delivery to a publicly-owned or publicly-leased address, to
tribal land absent tribal authorisation, and to "a school providing instruction
in kindergarten or any grades 1 through 12, day care center, or youth center."

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15416> (accessed 19 Aug 2026)

**Address validation must therefore reject:**

- Anything outside California.
- **PO boxes and mail drops** — "physical address" excludes them.
- Known public buildings, schools, daycares and youth centres. Realistically you
  cannot detect all of these programmatically; the practical control is a driver
  instruction plus a checkout attestation that the address is a private
  residence or business the customer controls.

#### The delivery-zone engine must split adult-use from medicinal

This is the single most important structural point in §7, and it is easy to miss
because §15416(d) reads like a clean statewide permission. It is not — **the two
channels have different legal footing, and a one-dimensional "serviceable ZIPs"
list cannot express the difference.**

**Adult-use — a regulation, and it does not preempt local bans.** §15416(d) says
any jurisdiction in California, and the rule survived the challenge brought by
~25 cities and counties in Fresno County Superior Court in 2021. But the outcome
was narrower than the industry hoped, and the dismissal is **non-precedential**:
the court upheld the state rule while leaving local governments room to enforce
their own ordinances against operators. A DCC regulation permitting YB to deliver
is not a shield against a city ordinance prohibiting it.

**Medicinal — a statute, and it *does* preempt local bans.** B&P §26322(a),
added by SB 1186 (Stats. 2022, Ch. 395), operative **1 January 2024**, verbatim:

> A local jurisdiction shall not adopt or enforce any regulation that prohibits
> the retail sale by delivery within the local jurisdiction of medicinal cannabis
> to medicinal cannabis patients or their primary caregivers, or that otherwise
> has the effect of prohibiting the retail sale by delivery within the local
> jurisdiction of medicinal cannabis … in a timely and readily accessible manner,
> and in types and quantities that are sufficient to meet demand …

§26322(a)(1)–(5) enumerate what a locality may not restrict, including the number
of authorised businesses, **operating hours**, and the number or frequency of
deliveries. §26322(b) preserves "reasonable regulations" on zoning, security,
public health and safety, licensing, and taxes.

Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26322> (accessed 19 Aug 2026)

**Consequence for the data model:** serviceability is a function of
`(jurisdiction, channel)`, not of `jurisdiction` alone. A city that bans adult-use
delivery may still be obliged to permit medicinal delivery. Model it as:

```
DeliveryZone { jurisdictionId, adultUseAllowed: bool, medicinalAllowed: bool,
               notes, reviewedAt, reviewedBy }
```

with both flags configurable per jurisdiction and an audit trail of who decided
and when. **Do not hard-code a statewide radius on the assumption the question is
settled**, and do not collapse the two channels into one boolean — that bakes in a
legal error that is expensive to unpick later. Which jurisdictions YB actually
serves is a business and legal decision; see §13.

### 7.4 At the door

**4 CCR §15415:**

> (a) All deliveries of cannabis goods shall be performed by a delivery employee
> who is directly employed by a licensed retailer.
>
> (b) Each delivery employee of a licensed retailer shall be at least 21 years of
> age.
>
> (c) All deliveries of cannabis goods shall be made in person. A delivery of
> cannabis goods shall not be made through the use of an unstaffed vehicle.

> (f) A delivery employee … shall, during deliveries, carry a copy of the
> retailer's current license, a copy of the QR Code certificate issued by the
> Department … the employee's government-issued identification, and an
> identification badge provided by the employer … A delivery employee shall
> provide a copy of the retail license, a copy of the QR Code certificate, and
> their employee identification badge to a delivery customer upon request.
>
> (g) Prior to providing cannabis goods to a delivery customer, a delivery
> employee shall confirm the identity and age of the delivery customer as
> required by section 15404 …

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15415> (accessed 19 Aug 2026)

**Notes for the storefront:** no third-party courier, no locker, no leave-at-door,
no unattended handoff — all foreclosed by "in person" and the §15415(g)
identity check. If the UI offers a delivery-instructions field, do not let it
imply "leave it at the door" is available.

### 7.5 The delivery request receipt — nine mandated elements

**4 CCR §15420** requires a hard-copy or electronic delivery request receipt for
**each** delivery, containing:

1. The legal business name and licence number of the licensed retailer
2. The first name and employee number of the retailer's delivery employee
3. The first name and employee number of the employee who prepared the order
4. The first name of the customer and a retailer-assigned customer number
5. The date and time the delivery request was made
6. The delivery address
7. A description of all cannabis goods, including weight, volume, or other
   accurate measure
8. The total amount paid for the delivery, including any taxes or fees
9. Upon delivery: the date and time the delivery was made, and the handwritten or
   electronic signature of the customer

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15420> (accessed 19 Aug 2026)

**This is the highest-value item in this document for the data model**, because
it drives fields most storefronts do not capture:

- **Employee numbers** for *both* the driver and the order preparer. Two distinct
  staff identifiers must be recorded per order.
- A **retailer-assigned customer number** — a stable customer ID, distinct from
  the phone number.
- A **customer signature captured at handover**, plus delivery timestamp. This
  belongs in the driver app, but the order record must have somewhere to put it.
- **Per-line weight or volume** for every item — not just a price and a product
  name. If the catalogue does not carry an accurate measure per SKU, the receipt
  cannot be generated compliantly.

> **The receipt schema is deliberately pseudonymising — build it that way.**
> Every person on a §15420 receipt appears as **first name + opaque number**:
> the driver, the order preparer, and the customer. Nowhere does the regulation
> ask for a surname, a phone number, an email address, or a date of birth.
>
> **Do not put full customer names on delivery receipts.** The instinct is to
> print everything the system knows; here that is both unnecessary and worse for
> YB. These receipts travel in vehicles, get handed over at doors, and are
> retained as commercial records — the regulator has already decided how much
> identity that document needs to carry, and the answer is "first name and a
> number." Treat that as a designed privacy floor, not an oversight to be
> helpfully corrected. It also aligns neatly with data-minimisation expectations
> under CalOPPA and any future CCPA obligation (§8).

§15418(f) requires the retailer to provide the delivery request receipt to the
delivery employee, so the receipt must be generated and available to the driver
*before* departure, with the signature and delivery time filled in afterwards.

### 7.6 Vehicle inventory ceiling

**4 CCR §15418(a):**

> A licensed retailer's delivery employee shall not carry cannabis goods in the
> delivery vehicle with a value in excess of $10,000 at any time.

Valued at current retail price (§15418(b)). Not a website rule, but it caps how
orders can be batched onto a run, and any dispatch logic must respect it.

> Note: this figure was **$5,000** under earlier versions of the rule and many
> secondary sources still say $5,000. The current regulation says $10,000.
> Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15418> (accessed 19 Aug 2026)

§15418(h) requires a delivery employee with no requests for a 30-minute period to
return to the premises — relevant to dispatch, not the storefront.

### 7.7 Taxes on the receipt

**Rev. & Tax. Code §34011.2(d)**, verbatim:

> The cannabis retailer shall provide each purchaser with an invoice, receipt, or
> other document that separately states the cannabis excise tax.

Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=34011.2> (accessed 19 Aug 2026). Amended by Stats. 2025, Ch. 127 (AB 564), effective 22 Sept 2025.

**No specific sentence is mandated word-for-word** — the requirement is that the
excise tax be *separately stated*. A line item labelled "Cannabis excise tax"
satisfies it.

> ⚠️ **Do not print "The cannabis excise taxes are included in the total amount of
> this invoice."** That sentence was mandated by the *former* R&TC §34011(a)(2),
> which §34011(h) made **inoperative on 1 April 2023** when AB 195 moved excise
> collection from distributors to retailers. It is still widely copied from stale
> templates. Printing it today is affirmatively incorrect.

CDTFA warns that failure to separately state the tax means the entire selling
price may be treated as gross receipts subject to the excise tax — i.e. the
formatting error has a direct financial consequence.

**Rate history:**

| Period | Rate |
|---|---|
| 1 Jan 2023 – 30 Jun 2025 | 15 % |
| 1 Jul 2025 – 30 Sep 2025 | 19 % |
| **1 Oct 2025 – present** | **15 %** |

AB 564 (Stats. 2025, Ch. 127) reversed the increase; the 15 % rate operates from
1 October 2025. Sales made during the 19 % window stay at 19 %, and any
over-collection after 1 October 2025 must be refunded or reported as excess tax
collected.

**Do not hard-code 15 %.** R&TC §34011.2(a)(3) requires CDTFA to adjust the rate
for FY 2028–29 and every two years thereafter, announced by 1 May and operative
the following 1 July, capped at 19 % and **rounded to the nearest one-quarter of
one percent**. A future rate could be 17.25 %. Model it as a decimal in
configuration with an effective-date range, not as a constant.

**Tax ordering matters** (§34011.2(e)–(f)): sales tax is computed on a base that
*includes* the excise tax; the excise base *excludes* sales tax. Get the order
wrong and every receipt is wrong.

**Medicinal sales-tax exemption — R&TC §6369.6**, not §34011. The exemption
requires the purchaser to furnish the seller with **both**:

1. a valid Medical Marijuana Identification Card issued under Health & Safety
   Code §11362.71 (the state MMIC), **and**
2. a valid government-issued identification card.

**A physician's recommendation alone is not enough.** The exemption reaches
**sales and use tax only** — it does not touch the cannabis excise tax.

> **Two thresholds the POS must model separately.** 4 CCR §15404(b) lets an 18+
> customer buy *medicinal* cannabis on a physician's recommendation alone. That
> customer is a medicinal customer but is **still liable for sales tax** unless
> they also hold an MMIC. "Medicinal customer" ≠ "tax-exempt customer" — these
> are two different flags on the account, and conflating them under-collects tax.

Sources: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=34011.2>; CDTFA, <https://cdtfa.ca.gov/industry/cannabis/retailers.htm> (both accessed 19 Aug 2026)

---

### 7.8 If YB ever sells through a third-party platform

Not applicable to a first-party storefront, but relevant the moment YB lists on
Weedmaps, Leafly, or a similar ordering platform. **4 CCR §15415.1:**

> (a) A licensed retailer or licensed microbusiness shall not sell or otherwise
> transfer any cannabis goods to a customer through the use of an unlicensed
> third party, intermediary business, broker, or any other business or entity.

Contracting with a technology platform is permitted only on conditions
(§15415.1(b)) that include: the platform must not perform the delivery; no
profit-sharing with the platform; no joint advertising outside the platform;
**customer disclosures must include the retailer's legal business name and
licence number**, with the customer able to identify easily which licensee is
providing each product; and **all sales invoices and receipts must disclose the
retailer's legal business name and licence number**.

Source: <https://www.law.cornell.edu/regulations/california/4-CCR-15415.1> (accessed 19 Aug 2026)

Note how closely the platform disclosure rules track what YB should be doing on
its own site anyway — legal name plus licence number on the storefront and on
every receipt.

> **⚠️ If this storefront is ever operated as multi-tenant software** — one
> codebase serving several licensed retailers — **§15415.1(b) constrains the
> commercial model, not just the UI.** Two provisions bite:
>
> 1. **No revenue share on cannabis goods.** The platform operator may not take a
>    percentage of cannabis sales. **Flat SaaS fees only** — per-seat, per-month,
>    per-tenant. A "2 % of GMV" pricing model is not available here, and neither
>    is anything economically equivalent dressed up as a service fee.
> 2. **Per-tenant attribution in the UI.** Each tenant's legal business name and
>    licence number must appear in customer disclosures and on **every** invoice
>    and receipt, and the customer must be able to identify easily which licensee
>    is supplying each product. In practice: licence identity is a required,
>    non-nullable tenant field, and receipt templates must resolve it per order —
>    never a build-time constant.
>
> The platform must also not perform the delivery itself, and must not advertise
> the tenant's goods jointly outside the platform.

---

## 8. Required policies and pages

### 8.1 Privacy policy — MUST

**CalOPPA, B&P §22575**, applies to any commercial website operator that collects
personally identifiable information from California residents. There is **no
size or revenue threshold** — it applies to YB regardless of headcount or
turnover. The policy must be **conspicuously posted**, and must:

1. Identify the categories of personally identifiable information collected and
   the categories of third parties with whom it may be shared;
2. Describe any process by which a consumer may review and request changes to
   their information;
3. Describe the process for notifying consumers of material changes to the
   policy;
4. State its **effective date**;
5. **Disclose how the operator responds to browser "Do Not Track" signals** or
   other mechanisms for controlling collection of personal information across
   third-party sites over time;
6. Disclose whether other parties may collect personally identifiable information
   about a consumer's online activities across different sites when using the
   operator's service.

Source: <https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575> (accessed 19 Aug 2026); amended by Stats. 2013, Ch. 390 (AB 370).

Item 5 is the one that is almost always missing. A boilerplate policy that never
mentions Do Not Track does not satisfy CalOPPA.

**The storefront currently has no `/privacy` route.** This is a genuine gap.

### 8.2 CCPA / CPRA — probably not applicable, but verify

The CCPA/CPRA applies only to a "business" meeting one of three thresholds
(Civ. Code §1798.140(d)): an annual-revenue threshold (statutorily $25 M, subject
to CPPA inflation adjustment), buying/selling/sharing the personal information of
100,000+ consumers or households annually, or deriving 50 %+ of annual revenue
from selling or sharing personal information.

A single-licence local delivery retailer will normally meet **none** of these.
But note two ways YB could be pulled in:

- **The 100,000-consumer threshold counts *households*** and is not revenue-linked.
  A high-volume delivery operation across a metro area can approach it.
- **"Sharing" for cross-context behavioural advertising** is what most often
  trips small operators — installing an ad pixel that transmits identifiers to an
  ad network can constitute "sharing," which carries opt-out obligations.

**Recommendation:** confirm the current adjusted revenue threshold and YB's
numbers with counsel. Design the privacy policy so it can accommodate CCPA rights
language later without a rewrite. Note the CPRA's "sensitive personal
information" category includes precise geolocation — and a cannabis delivery
business collects precise home addresses by definition.

### 8.3 Terms of Service — SHOULD, not MUST

No *general* California law requires a terms-of-service page. It is contract
hygiene — limitation of liability, dispute resolution, acceptable use, the fact
that orders are subject to ID verification and may be refused. Worth having.

> ⚠️ **But see §13 item 12.** SB 378 (operative 1 July 2026) imposes
> terms-of-service disclosure obligations on an "online cannabis marketplace,"
> and the statutory definition may capture a licensed retailer's own storefront.
> If counsel concludes it applies, this page becomes a **MUST with prescribed
> content**. Resolve this before treating the terms page as optional.

Cannabis-specific terms worth including: orders are void if ID cannot be produced
at delivery; the customer must be present and 21+; YB may refuse or cancel any
order; delivery is subject to state hours and daily limits; cash payment
expectations.

### 8.4 Tracking pixels — a real and under-appreciated risk

California has seen sustained litigation under the **California Invasion of
Privacy Act** (Penal Code §§631, 638.51) against websites using session-replay
tools, chat widgets, and advertising pixels, on the theory that they are
unlawful wiretaps or "pen registers." Cannabis retailers are attractive targets
because purchase data is sensitive.

I have not verified the current state of that case law or the status of
legislative attempts to curb these suits, and it moves quickly. **Flagged as a
lawyer question.** The conservative build posture: load no third-party analytics
or advertising pixel before the user has affirmatively consented, and keep any
pixel off the checkout and order-confirmation routes entirely.

### 8.5 SMS

YB intends to send order updates and marketing by SMS. Three separate constraints:

1. **Cannabis law** — age affirmation before adding a number to a marketing list
   (§26151(c), 4 CCR §15041(d)). Covered in §3.2. This is a MUST.
2. **Telephone consumer protection law** — marketing texts require prior express
   *written* consent; transactional order-status messages are treated differently
   from marketing. Keep the two consents separate in the data model, with
   separate opt-outs, and record consent evidence (timestamp, IP, the exact
   disclosure text shown). I have not verified the current federal consent rules,
   which have been in flux; **confirm with counsel before sending marketing SMS.**
3. **Carrier and aggregator policy** — this is an operational blocker independent
   of law. US carriers and messaging aggregators apply restrictive policies to
   cannabis-related SMS traffic, and campaigns are routinely rejected or filtered
   regardless of state legality. **Verify with the chosen SMS provider before
   building on the assumption that cannabis marketing SMS will deliver.**
   Transactional delivery notifications are more likely to be permitted than
   promotional blasts, but neither is guaranteed.

---

## 9. Product-page requirements

### 9.1 What is actually mandated on a product page

Only two things, and neither is the one people expect:

| Item | Status | Citation |
|---|---|---|
| Prop 65 warning (inline, or a `WARNING` link) | **MUST** (subject to the <10-employee exemption) | 27 CCR §25602(b), §§25607.39/.41/.43/.45 |
| Vape disposal message on cartridge / integrated vaporizer pages | **MUST** | B&P §26152.1 |
| Licence number (via global footer) | **MUST** | B&P §26151(a)(1) |

### 9.2 THC / CBD content — NOT mandated for websites

I looked specifically for a rule requiring a retailer to publish potency on a web
product page and **found none**. The mg-per-serving and mg-per-package
declarations in the DCC's labelling rules attach to the **package label**, not to
advertising or a menu.

**But:** if YB displays potency — and commercially it must, customers expect it —
then **B&P §26152(b)** applies:

> Publish or disseminate advertising or marketing containing any statement
> concerning a brand or product that is inconsistent with any statement on the
> labeling thereof.

So the numbers on the PDP must match the numbers on the label of the specific
package delivered. **This is a real operational trap for a webstore**: batch-level
potency varies, and a menu that shows a nominal "22 % THC" while the delivered
package says 19.4 % is publishing a statement inconsistent with the label.

**Recommendations:**

- Source potency from the same batch/lot record that produced the label, not from
  a hand-entered marketing field.
- Where potency is batch-variable, display a qualified value ("THC: ~22 % — see
  package for batch-specific content") rather than a false precision.
- Treat supplier-supplied catalogue data as untrusted for any number that also
  appears on a label.

### 9.3 Per-package potency limits — 4 CCR §17304

These are **manufacturing** limits, enforced upstream of YB. They constrain what
can lawfully be in the catalogue, not what the page must say.

| Category | Adult-use | Medicinal |
|---|---|---|
| Edible | 10 mg THC per serving, **100 mg per package** | Same — **except** orally dissolving products (sublingual lozenges, mouth strips): up to **500 mg per package**, in discrete servings of ≤ 10 mg per piece |
| Concentrate or topical | **1,000 mg THC per package** | **2,000 mg THC per package** |

Both medicinal uplifts require the product to be labelled **"FOR MEDICAL USE
ONLY"** and to be sold only to a medicinal-use patient (§17304(b), (d)).

**A common error worth encoding correctly:** the base edible limit is **100 mg for
both channels**. Only *orally dissolving* edibles get the 500 mg medicinal uplift.
There is no general "medical edibles go to 500 mg / 1,000 mg" rule.

If YB buys from licensed distributors, package-limit compliance is the
manufacturer's obligation. YB's own exposure is the §15409 **daily-limit**
calculation, which is squarely YB's job — see §7.2.

### 9.3.1 What the label must carry (for reference, not for the web page)

4 CCR §17407(b) requires the **package** to state cannabinoid content:

> (1) For an edible product or a cannabis concentrate for which the manufacturer
> has established serving designations, THC and CBD content expressed in
> milligrams per serving and milligrams per package.
> (2) For a topical cannabis product or a cannabis concentrate without serving
> designations, THC and CBD content expressed in milligrams per package.
> (3) For nonmanufactured cannabis goods, Total THC content expressed as a
> percentage.
> (4) Packages of infused pre-rolls shall be labeled with either: (A) The
> cannabinoid content in milligrams; or (B) The cannabinoid content of the dried
> flower expressed as a percentage and the added cannabinoid content in
> milligrams.

Note the units differ by product class — percentage for flower, milligrams for
manufactured goods. A web menu that renders everything as a percentage will
diverge from the label for edibles and concentrates, which is a §26152(b)
problem. Model potency as `{ value, unit, basis }`, not as a single number.

### 9.4 Anything that must accompany a price?

**No.** No California rule requires a specific disclosure adjacent to a displayed
price — no "taxes extra" notice, no all-in pricing mandate for cannabis. The tax
disclosure obligation attaches to the **receipt** (§7.7), not the menu.

**SHOULD:** show that state and local cannabis taxes are added at checkout.
Cannabis tax stacking is large enough that an unexplained jump between menu price
and total is a real abandonment and complaint driver.

---

## 10. Placement map

Mapped to the storefront's existing Next.js routes.

### Global — `src/app/layout.tsx` footer, every route

| Element | Status |
|---|---|
| Legal entity name + DCC licence number | **MUST** — §26151(a)(1) |
| Licence type ("Licensed non-storefront retailer") | SHOULD |
| Link to `/privacy` | **MUST** — CalOPPA conspicuous posting |
| Link to `/terms` | SHOULD |
| Link to DCC licence lookup | SHOULD |
| GOVERNMENT WARNING text | SHOULD |
| "21+ only. Keep out of reach of children." | SHOULD |
| Prop 65 warning | ❌ **Footer placement does not satisfy Prop 65.** Must be on the PDP. A footer copy is harmless but earns nothing. |

### `/` age gate — `AgeGate.tsx`

| Element | Status |
|---|---|
| 21+ affirmation before catalogue renders | MUST (indirect) — §3.2 |
| Licence number | **MUST** — the gate is marketing too |
| No cartoon / no image of anyone under 21 | **MUST** |
| Statement that ID is required at delivery | SHOULD (sets expectations, reduces failed deliveries) |
| Link to privacy policy | SHOULD |

### `/` catalogue and category listings

| Element | Status |
|---|---|
| No "candy"/"kandy" in names, slugs, alt text, meta | **MUST** |
| No cartoons, no under-21 imagery | **MUST** |
| No free-product or sweepstakes promotion | **MUST** |
| No health claims in category or teaser copy | **MUST** |
| Delivery-area / hours notice | SHOULD |

### `/product/[id]` — the compliance-critical page

| Element | Status |
|---|---|
| **Prop 65 warning** matching the product's consumption route, inline or via a link whose text is exactly `WARNING` | **MUST** — 27 CCR §25602(b) |
| **Vape disposal message** verbatim, if cartridge or integrated vaporizer | **MUST** — §26152.1 |
| No description implying a vape is "disposable" or bin/recycling safe | **MUST** — §26152.1(b) |
| No health claims in the description | **MUST** — §26154 |
| Any potency/weight shown must match the package label | **MUST** — §26152(b) |
| Not labelled as beer/wine/liquor/spirits | **MUST** — 4 CCR §15040.1 |
| THC / CBD content | SHOULD |
| Package-label image or GOVERNMENT WARNING | SHOULD |

### `/cart`

| Element | Status |
|---|---|
| Enforce §15409 daily limits, counting concentrate inside manufactured products | **MUST** |
| Explain *why* a limit blocked the addition, citing the state daily limit | SHOULD |
| Prop 65 warning surface | SHOULD — the PDP is what satisfies the rule, but a cart-level warning also supports §25602(b)(1)(C) |

### `/checkout`

| Element | Status |
|---|---|
| **DCC safer-use brochure prominently displayed**, above the place-order control | **MUST** — B&P §26070.3(b) |
| Record the brochure offer for a first-time customer (`brochureOfferedAt`) | **MUST** — §26070.3(b) |
| No sale or delivery outside 06:00–22:00 Pacific, computed in `America/Los_Angeles` | **MUST** — §15403, §15415(d) |
| Blocking out-of-hours order *placement* (configurable, default on) | SHOULD — unresolved, see §7.1 |
| Reject non-California, PO box, and non-physical addresses | **MUST** — §15416(a) |
| Re-validate daily limits server-side | **MUST** — §15409 |
| Excise tax and sales tax as separate line items, in the correct order | **MUST** (receipt) — RTC §34011.2(d) |
| Notice: valid unexpired government photo ID required at delivery; recipient must be 21+ and present | SHOULD (strong) |
| Notice: no leave-at-door, in-person handoff only | SHOULD |
| Cash-on-delivery expectations, exact-change policy | SHOULD |
| Separate, unbundled consent checkboxes for transactional vs marketing SMS | **MUST** for marketing — §26151(c), 4 CCR §15041(d) |
| No third-party ad pixel on this route | SHOULD (strong) — §8.4 |

### `/checkout/confirmation`

| Element | Status |
|---|---|
| Excise tax separately stated | **MUST** — RTC §34011.2(d) |
| Legal business name + licence number on the receipt | **MUST** — §15420(a)(1) |
| Order date/time, delivery address, itemised goods with weight/volume, total paid incl. taxes and fees | **MUST** — §15420 |
| Customer first name + retailer-assigned customer number | **MUST** — §15420 |
| Restatement of the ID requirement | SHOULD |

### `/track` and `/track/[token]`

| Element | Status |
|---|---|
| Licence number (global footer) | **MUST** |
| ID-at-door reminder | SHOULD |
| Token must not be guessable; page should not expose more PII than needed | SHOULD (strong) |

### `/signin`, `/account`

| Element | Status |
|---|---|
| Age affirmation recorded before any marketing opt-in | **MUST** — 4 CCR §15041(d) |
| Marketing SMS opt-out available | **MUST** (telecoms law) |
| Privacy policy link at the point of collection | SHOULD (strong) |

### `/privacy` — **does not currently exist**

| Element | Status |
|---|---|
| All six CalOPPA content items, including the Do Not Track disclosure | **MUST** — B&P §22575 |
| Effective date | **MUST** |

### `/terms` — **does not currently exist**

Entirely SHOULD. See §8.3.

---

## 11. What the operator must supply

A developer cannot invent any of these. Collect them before the footer, receipts,
or policy pages can be finished.

### Identity and licensing

- [ ] **Exact legal entity name** as registered with the DCC — the name that must
      appear on the delivery request receipt (§15420(a)(1)) and in the footer.
      Not the trading name if they differ.
- [ ] **Trading / DBA name**, if different.
- [ ] **DCC licence number**, exactly as issued (e.g. `C9-0000000-LIC`).
- [ ] **Licence type** — confirm non-storefront retailer (Type 9) vs storefront
      retailer (Type 10) vs microbusiness (Type 12). This changes which rules apply.
- [ ] **Licence expiry date**, and who owns the renewal calendar.
- [ ] **Licensed premises address** — needed for records; note it is *not*
      required on the website and, since a non-storefront premises is closed to
      the public (§15414(d)), publishing it is a judgement call.
- [ ] **Local jurisdiction licence / permit number**, and the local authority.
- [ ] **Seller's permit number** (CDTFA).

### Operations

- [ ] **Which jurisdictions YB will actually deliver into — decided separately
      for adult-use and medicinal.** Not "everywhere the regulation allows." A
      city may ban adult-use delivery while being statutorily barred from banning
      medicinal delivery (B&P §26322). One flag per channel per jurisdiction, with
      who decided and when. See §7.3 and §13.
- [ ] **Operating hours**, within the 06:00–22:00 Pacific ceiling.
- [ ] **Adult-use only, or adult-use plus medicinal?** If medicinal, the
      physician's-recommendation verification process, the different daily limits,
      and the MMIC sales-tax exemption all need building.
- [ ] **Employee number scheme** for drivers and order preparers (§15420(a)(2)–(3)).
- [ ] **Customer numbering scheme** (§15420(a)(4)).
- [ ] **Delivery / service fees**, and whether they are taxable.
- [ ] **Local cannabis business tax rate**, if the jurisdiction imposes one.

### Contact and legal

- [ ] **Registered contact address, email and phone** for the privacy policy.
- [ ] **Privacy contact** for access/deletion requests.
- [ ] **Do Not Track posture** — an actual decision, since CalOPPA requires
      disclosing it.
- [ ] **Employee headcount**, to determine whether the Prop 65 sub-10 exemption
      applies (§5.1), plus who will monitor crossing that line.
- [ ] **Name of the California cannabis attorney** who will review this build.

### Content

- [ ] **Sanitised product catalogue** — supplier descriptions reviewed for health
      claims, "candy"/"kandy" wording, "disposable" vape language, and cartoon
      artwork.
- [ ] **Per-product consumption route** (`smoked` / `ingested` / `vaped_dabbed` /
      `dermal`) to select the correct Prop 65 text.
- [ ] **Per-product net weight and concentrate-equivalent weight**, for §15409.
- [ ] **Photography cleared** for the no-under-21 rule.
- [ ] **Current DCC SB 540 safer-use brochure** downloaded and hosted, plus
      **printed copies stocked in every delivery vehicle** (B&P §26070.3(b)
      requires printed copies at final delivery, not just the online display).

---

## 12. Common practice that is NOT law

The owner asked for "all the rules so we will be safe." Part of being safe is not
spending money on rules that do not exist, and not believing the site is
compliant because it copied a competitor.

| Widely believed | Reality |
|---|---|
| "California bans depicting cannabis consumption in advertising." | **False.** No subdivision of B&P §26152 — nor anything in §§26150–26156 — prohibits depicting consumption. The words "depict"/"depiction" never appear in connection with consumption. The real rules are narrower and different: **no image of any person under 21** (4 CCR §15040(a)(2)) and nothing attractive to children (§26152(f)). A photo of an adult consuming is not prohibited by statute. *(Independently verified twice against leginfo.)* |
| "The GOVERNMENT WARNING must be on the website." | **False.** 4 CCR §17406 imposes it on the package's informational panel. No rule ports it to a web page. Displaying it is sensible practice, not compliance. |
| "You must show the universal symbol on product listings." | **False.** Packaging requirement only. |
| "You must link to the DCC licence lookup." | **False.** No such requirement. Good practice. |
| "A Prop 65 notice in the footer covers you." | **False, and actively wrong.** 27 CCR §25602(b)(1)(C) says a warning is *not* prominently displayed if the purchaser must search for it in the site's general content. It belongs on the product display page. |
| "Use the standard Prop 65 warning text." | **Wrong for cannabis.** Cannabis has tailored warnings (27 CCR §§25607.38–.47) that displace the generic text, and the **short-form warning is unavailable** for cannabis. The URL is `P65Warnings.ca.gov/cannabis`, not the bare domain. |
| "All discounts and promotions are banned." | **False.** §26153 bans *giving away* cannabis and accessories. Percentage and dollar discounts are not addressed anywhere in Chapter 15. BOGO-**free** is banned; BOGO-**half-off** is not. |
| "You need a paid ID-verification vendor to take online orders." | **False.** §26151(c) expressly permits "user confirmation, birth date disclosure, or other similar registration method." The binding ID check is in person at the door (§15404, §15415(g)). |
| "The 1,000-foot school rule applies to your website." | **False.** §26152(g) applies to an "advertising sign," defined at §26150(c) as "stationary or permanently affixed." A web page is neither. |
| "Delivery vehicles can carry $5,000 of product." | **Outdated.** The current 4 CCR §15418(a) figure is **$10,000**. Many secondary sources still say $5,000. |
| "A terms-of-service page is legally required." | **Mostly false, but no longer safe to assume** — see §13 item 12. No *general* law requires one, but SB 378 (operative 1 Jul 2026) may reach YB's own site. |
| "A regulation requires an age gate on the website." | **False.** No California statute or regulation mandates a site-entry age gate. What *is* mandatory is age affirmation before direct individualised communication and before adding anyone to a mailing list (B&P §26151(c), 4 CCR §15041(d)). Keep the gate — but as risk mitigation, not because a rule names it. |
| "Uploading an ID online satisfies the age-verification requirement." | **False.** §15404 contemplates *physical inspection* of the document, and §15415(g) puts that duty on the delivery employee at the door. Online affirmation and door-side verification are two separate, non-substitutable controls. Collecting ID images online buys no compliance credit and creates a sensitive-data liability. |
| "The delivery receipt should show the customer's full name." | **No — and prefer not to.** 4 CCR §15420 asks for the customer's **first name plus an opaque customer number**, and likewise first-name-plus-number for both employees. The schema is deliberately pseudonymising. |
| "Prop 65 applies to every business." | **False.** HSC §25249.11(b) exempts businesses employing fewer than 10 people. Worth checking before spending on Prop 65 tooling — though building it anyway is prudent. |
| "DCC regulations are Title 4 Division 42." | **False.** Title 4 **Division 19**. Division 42 was the old Title 16 numbering. A source using the wrong citation may be quoting superseded text. |
| "AB 1207 tightened the child-appeal packaging rules." | **False — AB 1207 (2023) was vetoed** on 8 October 2023 and never became law. The Governor's veto message objected that "attractive to children" was defined too broadly. The binding rules remain B&P §26120(b), §26152(f), 4 CCR §17408(a)(2) and §15040(a)(3). A successor bill, AB 2249, was still pending as of 17 August 2026 — see §13. |
| "The receipt must say 'The cannabis excise taxes are included in the total amount of this invoice.'" | **False and now wrong to print.** That was former R&TC §34011(a)(2), inoperative since 1 April 2023. Current law (§34011.2(d)) requires only that the excise tax be *separately stated*. |
| "California requires a mental-health / psychosis warning on cannabis." | **Not yet.** SB 540 directed the DCC to adopt updated label warnings by 1 July 2025; the rulemaking has not happened and the labelling regulations are unchanged as of the 1 July 2026 edition. The mental-health content California actually mandates today is in the **SB 540 brochure** (§5.4), which *is* required online. |
| "You must show a QR code linking to product details in place of label content." | **False.** The DCC's guidance is that QR codes and websites are **not** acceptable supplemental labelling. Supplemental label content must be an insert, fold-out, booklet, or hanging tag (4 CCR §17406(c)). |

---

## 13. Open questions / needs a lawyer

Honest limits of this desk research. Each of these is a real decision that
someone qualified must make.

1. **Does the 71.6 % audience rule reach YB's own website?** Genuinely unresolved.
   The statute has no carve-out for owned media, and "marketing" is defined
   broadly enough to catch an e-commerce menu; but the compliance machinery
   (obtain audience data, produce it on demand, remove the placement) is written
   for bought media and makes little sense applied to a first-party site. The age
   gate is the cheap hedge. **No text resolves this and I did not find a DCC
   determination.**

2. **Delivering *adult-use* into jurisdictions that ban cannabis retail.**
   4 CCR §15416(d) permits delivery to any jurisdiction in California, and the
   rule survived the 2021 challenge in Fresno County Superior Court — but that
   dismissal is **non-precedential**, the reporting at the time was explicit that
   it was not a clean industry win, and local governments retained room to enforce
   their own ordinances. A DCC regulation permitting delivery is not a shield
   against a city ordinance prohibiting it. I did not verify whether there has
   been appellate activity since 2021.

   **Medicinal is materially different and materially safer**: B&P §26322 (SB
   1186, operative 1 Jan 2024) *statutorily* preempts local bans on medicinal
   delivery, including local limits on operating hours and delivery frequency.
   Statutory preemption is a far stronger footing than a regulation that merely
   grants permission.

   **This is a business-risk decision about which cities to serve, per channel,
   and it needs current local advice — not a developer's reading of a
   regulation.** See §7.3 for the data model that keeps the two channels separable.

2a. **May a customer *place* an order outside 06:00–22:00 PT for delivery inside
   the window?** 4 CCR §15403 restricts the **sale** and the **delivery**, and
   §15415(d) restricts **receipt** by the customer. None of them addresses when a
   request may be submitted, and I found no DCC guidance. Both readings are
   defensible — see §7.1. Defaulting to blocking out-of-hours placement is the
   safe posture, but overnight order capture is commercially material for a
   delivery business, so it is worth an hour of counsel's time to get a written
   answer rather than leaving revenue on the table by default.

3. **Where the line sits on strain-effect language.** "Relaxing," "uplifting,"
   "great for sleep" — §26154 bars health-related statements that are untrue or
   create a misleading impression, and §26150(d) defines the term expansively
   enough to arguably reach effect descriptors. The industry uses this language
   universally. Counsel should set an explicit, written rule that the catalogue
   team can apply.

4. **Prop 65 employee-count exemption.** Whether YB is under ten employees, and
   how that is counted (contractors? part-time drivers? measured when?), is a
   legal question with real money attached.

5. **Whether Prop 65 also requires a warning delivered *with* the product** for
   internet sales, on top of the website warning. OEHHA's guidance reads §25602(b)
   as requiring both; respected practitioners dispute it. Probably moot for YB,
   since licensed product arrives already labelled by the manufacturer — but
   worth a sentence of confirmation.

6. **CCPA/CPRA applicability**, including the current inflation-adjusted revenue
   threshold and whether any advertising pixel constitutes "sharing." Not verified
   here.

7. **CIPA / tracker litigation exposure** and the current state of that case law,
   including any legislative change. Not verified here; it moves fast. Directly
   affects whether YB can run a Meta or Google pixel at all.

8. **SMS consent rules** under current federal telecoms law, which has been in
   flux. Also whether YB's chosen aggregator will carry cannabis traffic at all —
   an operational question to settle with the vendor before building on it.

9. **Local licence conditions.** The largest unknown in this document. Cities and
   counties routinely impose their own advertising, signage, delivery-manifest,
   hours, and disclosure conditions as licence terms. **These are not published in
   any central place and cannot be researched from the outside.** YB must read its
   own local permit conditions and hand them to the developer. Assume there is at
   least one website-affecting requirement in there.

10. **Per-package potency limits** (§9.3) were not verified against the July 2026
    regulation text. Confirm before using them as catalogue validation.

11. **Whether any bill chaptered during 2026 further amends these provisions.**
    Three of the statutes cited here changed on 1 January 2026 (AB 8, AB 1170).
    A non-urgency bill chaptered in 2026 would take effect 1 January 2027 and
    would not yet show in current-law displays. **Re-check leginfo after the
    October 2026 chaptering window.**

12. **🚩 SB 378 — "online cannabis marketplace." Highest-priority counsel
    question in this document.** SB 378 (Wiener, Stats. 2025, Ch. 411) took effect
    **1 July 2026** and added B&P Chapter 31.3 (§22943 et seq.), imposing
    terms-of-service disclosure and unlicensed-seller reporting duties on an
    "online cannabis marketplace," with exposure of **up to $10,000 per violation
    per day**.

    The legislative findings target third-party platforms such as Weedmaps and
    Leafly. **But the definition at §22943(g)(2) reaches a site that "offers for
    sale cannabis or a cannabis product," with no third-party qualifier on that
    prong.** Read literally, a licensed retailer's own e-commerce site is an
    online cannabis marketplace.

    This is roughly seven weeks operative, with no case law and no DCC guidance.
    I cannot resolve it and I am not going to guess at a statute carrying
    five-figure daily penalties. **Have counsel read §22943 against YB's site
    before launch.** If it does apply, it likely converts the Terms of Service
    page from a SHOULD (§8.3) into a MUST with prescribed content — which would
    change the build.

13. **AB 2249 (pending).** Would define "attractive to children" for **both**
    packaging (§26120(b)) and **advertising** (§26152(f)), with a proposed
    operative date of 1 January 2028. As of 17 August 2026 it had been ordered to
    third reading and was not enacted. The legislative session ends 31 August
    2026, so its status may change within days of this document being written.
    If enacted it will directly constrain site imagery and product naming. Two
    related bills — AB 2532 (Poison Help line on edible labels) and AB 2667 (vape
    branding) — were also pending. **Re-check all three.**

---

## 14. Source register

All URLs accessed **19 August 2026**.

### Statutes — California Business & Professions Code, Division 10

| Section | Subject | URL |
|---|---|---|
| §26150 | Advertising definitions | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26150) |
| §26151 | Licence number, 71.6 %, age affirmation | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26151) |
| §26152 | Prohibited advertising *(amended AB 8, eff. 1 Jan 2026)* | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26152) |
| §26152.1 | Vape disposal message *(operative 1 Jul 2024)* | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26152.1) |
| §26152.2 | AG / city attorney enforcement *(amended AB 1170, eff. 1 Jan 2026)* | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26152.2) |
| §26153 | No free cannabis or accessories | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26153) |
| §26154 | Health-related statements | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26154) |
| §26155 | Exemptions; noncommercial speech | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26155) |
| **§26070.3** | **SB 540 safer-use brochure — online display duty** | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26070.3) |
| §26120 | Packaging and labelling; GOVERNMENT WARNING (statutory twin) | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26120) |
| §26121 | SB 540 label-warning rulemaking mandate *(deadline missed; no regs adopted)* | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26121) |
| §22943 et seq. | SB 378 "online cannabis marketplace" *(operative 1 Jul 2026 — see §13)* | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22943) |
| **§26322** | **Statutory preemption of local bans on *medicinal* delivery** (SB 1186, operative 1 Jan 2024) | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26322) |
| §22575 | CalOPPA privacy policy | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575) |

### Regulations — 4 CCR Division 19 (DCC)

Current consolidated text effective **1 July 2026**:
<https://cdn.cannabis.ca.gov/wp-content/uploads/sites/2/2026/08/dcc_regulations_20260701.pdf>

| Section | Subject | URL |
|---|---|---|
| §15039 | Licence / QR posting (premises only) | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15039) |
| §15040 | Advertising placement and prohibitions | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15040) |
| §15040.1 | Marketing as alcoholic products | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15040.1) |
| §15040.2 | Prohibited business promotions | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15040.2) |
| §15041 | Age affirmation for direct communication | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15041) |
| §15403 | Hours of operation | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15403) |
| §15404 | Retail customers; acceptable ID | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15404) |
| §15409 | Daily limits | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15409) |
| §15414 | Non-storefront retailer | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15414) |
| §15415 | Delivery employees | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15415) |
| §15415.1 | Deliveries via technology platforms | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15415.1) |
| §15416 | Delivery to a physical address | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15416) |
| §15418 | Goods carried during delivery | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15418) |
| §15420 | Delivery request receipt | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-15420) |
| §17304 | Per-package THC limits | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-17304) |
| §17403 | Primary panel, nonmanufactured goods (flower GOVERNMENT WARNING) | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-17403) |
| §17406 | Informational panel labelling (manufactured GOVERNMENT WARNING) | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-17406) |
| §17407 | Cannabinoid content labelling | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-17407) |
| §17408 | Labelling restrictions | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-17408) |
| §17410 | Universal symbol | [LII](https://www.law.cornell.edu/regulations/california/4-CCR-17410) |

### Proposition 65 — 27 CCR Division 4, and OEHHA

| Section | Subject | URL |
|---|---|---|
| §25602 | Methods of transmission, incl. internet | [LII](https://www.law.cornell.edu/regulations/california/27-CCR-25602) |
| §25603 | Generic warning content and symbol | [LII](https://www.law.cornell.edu/regulations/california/27-CCR-25603) |
| §25607.38 / .39 | Smoked cannabis — method / content | [LII](https://www.law.cornell.edu/regulations/california/27-CCR-25607.39) |
| §25607.40 / .41 | Ingested — method / content | [LII](https://www.law.cornell.edu/regulations/california/27-CCR-25607.41) |
| §25607.42 / .43 | Vaped or dabbed — method / content | [LII](https://www.law.cornell.edu/regulations/california/27-CCR-25607.43) |
| §25607.44 / .45 | Dermal — method / content | [LII](https://www.law.cornell.edu/regulations/california/27-CCR-25607.45) |
| HSC §25249.11 | Sub-10-employee exemption | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=25249.11) |
| — | OEHHA cannabis product hub | <https://www.p65warnings.ca.gov/products/cannabis-and-thc-products> |

Prop 65 listings: marijuana smoke listed for **cancer** effective **19 June 2009**;
cannabis (marijuana) smoke and Δ9-THC listed for **developmental toxicity**
effective **3 January 2020**, with the warning obligation beginning **3 January
2021**. **No NSRL or MADL has been established for Δ9-THC** — there is no numeric
threshold below which a warning is automatically unnecessary.

### Tax

| Source | Subject | URL |
|---|---|---|
| RTC §34011.2 | Excise tax; receipt must separately state it; biennial rate adjustment | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=34011.2) |
| RTC §6369.6 | Medicinal sales-tax exemption (MMIC **plus** government ID) | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=6369.6) |
| HSC §11006.5 | "Cannabis concentrate" definition — **time-staged, changes 1 Jan 2028** | [leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11006.5) |
| CDTFA | Cannabis retailer tax guidance; 15 % rate from 1 Oct 2025 | <https://cdtfa.ca.gov/industry/cannabis/retailers.htm> |

### DCC guidance

- Regulations index — <https://www.cannabis.ca.gov/cannabis-laws/dcc-regulations/>
- Licence search — <https://search.cannabis.ca.gov/>
- Labelling guidance (GOVERNMENT WARNING text) — <https://www.cannabis.ca.gov/licensees/cannaconnect-compliance-hub/labeling/manufactured-final-form/>

---

*Prepared 19 August 2026. Re-verify before launch — three of the statutes cited
here changed on 1 January 2026, and the DCC regulation text was last reissued on
1 July 2026.*
