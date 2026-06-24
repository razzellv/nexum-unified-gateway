import { CLINS, type CLIN, type ProcurementModel } from '@/config/govconConfig';

export interface QuoteLineItem {
  clin: CLIN;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  model: ProcurementModel;
}

export interface Quote {
  id: string;
  orgName: string;
  contactEmail: string;
  sector: string;
  model: ProcurementModel;
  lineItems: QuoteLineItem[];
  subtotal: number;
  baseTotal: number;
  optionYear1Total: number;
  optionYear2Total: number;
  optionYear3Total: number;
  fiveYearTotal: number;
  generatedAt: string;
  expiresAt: string; // 90 days
}

export interface SOWSection {
  title: string;
  content: string;
}

export class GovConQuoteEngineClass {
  calculateLineItem(clin: CLIN, quantity: number, model: ProcurementModel): QuoteLineItem {
    const unitPrice = clin.unitPrice[model] || clin.unitPrice.commercial;
    return {
      clin,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      model,
    };
  }

  buildQuote(
    clinSelections: Array<{ clinId: string; quantity: number }>,
    model: ProcurementModel,
    orgName: string,
    contactEmail: string,
    sector: string,
  ): Quote {
    const lineItems: QuoteLineItem[] = [];

    for (const sel of clinSelections) {
      const clin = CLINS.find(c => c.id === sel.clinId);
      if (!clin || clin.isOptionYear) continue;
      lineItems.push(this.calculateLineItem(clin, sel.quantity, model));
    }

    const subtotal = lineItems.reduce((s, li) => s + li.totalPrice, 0);
    const baseTotal = subtotal;
    const escalation = 1.03;
    // Option years = 103% of prior year for software/support CLINs
    const optionYear1Total = lineItems
      .filter(li => ['software', 'support'].includes(li.clin.type))
      .reduce((s, li) => s + li.totalPrice * escalation, 0);
    const optionYear2Total = optionYear1Total * escalation;
    const optionYear3Total = optionYear2Total * escalation;

    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 90);

    return {
      id: `Q-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`,
      orgName,
      contactEmail,
      sector,
      model,
      lineItems,
      subtotal,
      baseTotal,
      optionYear1Total,
      optionYear2Total,
      optionYear3Total,
      fiveYearTotal: baseTotal + optionYear1Total + optionYear2Total + optionYear3Total,
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
  }

  generateSOW(quote: Quote): SOWSection[] {
    const serviceClins = quote.lineItems.filter(li => li.clin.type !== 'option_year');
    const sections: SOWSection[] = [
      {
        title: '1. BACKGROUND',
        content: `${quote.orgName} requires Facility Intelligence™ services to support operational continuity, compliance readiness, and institutional knowledge preservation. Nexum Suum LLC provides a purpose-built platform and professional services designed to transform facility operations into a defensible operational record.`,
      },
      {
        title: '2. SCOPE OF WORK',
        content: `The contractor shall provide the following services during the period of performance:\n\n${serviceClins.map((li, i) => `${i + 1}. ${li.clin.title} — ${li.clin.description}`).join('\n\n')}`,
      },
      {
        title: '3. DELIVERABLES',
        content: serviceClins.map(li => `${li.clin.title}:\n${li.clin.deliverables.map(d => `  • ${d}`).join('\n')}`).join('\n\n'),
      },
      {
        title: '4. PERIOD OF PERFORMANCE',
        content: `Base Period: 12 months from contract award.\n${quote.optionYear1Total > 0 ? 'Option Year 1: 12 months following Base Period.\nOption Year 2: 12 months following Option Year 1.\nOption Year 3: 12 months following Option Year 2.' : ''}`,
      },
      {
        title: '5. CONTRACT TYPE',
        content: `Firm-Fixed-Price (FFP). All CLINs are priced on a fixed-price basis. No cost-plus arrangements apply.`,
      },
      {
        title: '6. PLACE OF PERFORMANCE',
        content: `Services shall be performed at the Government facility and/or remotely via secure cloud platform access. On-site engagements shall be conducted at ${quote.orgName} facilities as mutually agreed.`,
      },
      {
        title: '7. APPLICABLE STANDARDS',
        content: `The contractor shall comply with applicable OSHA, NFPA, EPA, and sector-specific regulatory standards. All platform data shall be stored in AWS us-east-2 region with AES-256 encryption at rest and TLS 1.2+ in transit.`,
      },
      {
        title: '8. CONTRACTOR QUALIFICATIONS',
        content: `Nexum Suum LLC is an MBE-Certified, SAM.gov-registered firm with a licensed NJ Stationary Engineer on staff. The contractor holds relevant professional certifications and carries appropriate liability insurance.`,
      },
      {
        title: '9. GOVERNMENT-FURNISHED INFORMATION',
        content: `The Government shall provide: facility access for on-site engagements, existing equipment documentation, relevant regulatory correspondence, and points of contact for each functional area assessed.`,
      },
      {
        title: '10. ACCEPTANCE CRITERIA',
        content: `Deliverables shall be accepted in writing by the Contracting Officer's Representative (COR) within 10 business days of submission. Rejected deliverables shall be revised and resubmitted within 5 business days.`,
      },
    ];
    return sections;
  }

  generateROM(quote: Quote): string {
    return `ROUGH ORDER OF MAGNITUDE (ROM) ESTIMATE\n\nOrganization: ${quote.orgName}\nProcurement Model: ${quote.model.toUpperCase()}\nGenerated: ${new Date(quote.generatedAt).toLocaleDateString()}\n\nBASE PERIOD ESTIMATE\n${quote.lineItems.map(li => `  ${li.clin.number} - ${li.clin.title}: $${li.totalPrice.toLocaleString()}`).join('\n')}\n  ─────────────────────────────────\n  Base Period Total: $${quote.baseTotal.toLocaleString()}\n\n${quote.optionYear1Total > 0 ? `OPTION YEARS (software/support CLINs only, 3% annual escalation)\n  Option Year 1: $${quote.optionYear1Total.toLocaleString()}\n  Option Year 2: $${quote.optionYear2Total.toLocaleString()}\n  Option Year 3: $${quote.optionYear3Total.toLocaleString()}\n  ─────────────────────────────────\n  5-Year Total Estimated Value: $${quote.fiveYearTotal.toLocaleString()}\n\n` : ''}NOTE: This ROM is provided for budget planning purposes only and does not constitute an offer. Final pricing subject to contract negotiations and scope confirmation. Valid for 90 days from generation date.\n\nNexum Suum LLC | SAM.gov Registered | MBE Certified`;
  }

  getUnlockedFeatures(purchasedClinIds: string[]): string[] {
    const features = new Set<string>();
    for (const clinId of purchasedClinIds) {
      const clin = CLINS.find(c => c.id === clinId);
      if (clin) clin.featureFlags.forEach(f => features.add(f));
    }
    return Array.from(features);
  }

  saveQuote(quote: Quote): void {
    const existing: Quote[] = JSON.parse(localStorage.getItem('nexum_govcon_quotes') || '[]');
    existing.unshift(quote);
    localStorage.setItem('nexum_govcon_quotes', JSON.stringify(existing.slice(0, 50)));
  }

  getSavedQuotes(): Quote[] {
    return JSON.parse(localStorage.getItem('nexum_govcon_quotes') || '[]');
  }
}

export const GovConQuoteEngine = new GovConQuoteEngineClass();
