import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import type { Company } from "./types";

export interface CompanyData {
  [key: string]: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseCSVData = (csvData: string): Company[] => {
  const { data } = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  return (data as Record<string, string>[])
    .map((row) => ({
      name: row["Company Name"] || "",
      tradestyle: row["Tradestyle"] || "",
      address: row["Address Line 1"] || "",
      city: row["City"] || "",
      state: row["State Or Province"] || "",
      postalCode: row["Postal Code"] || "",
      phone: row["Phone"] || "",
      url: row["URL"] || "",
      sales: row["Sales (USD)"] || "",
      employees: row["Employees (Total)"] || "",
      description: row["Business Description"] || "",
      industry: row["D&B Hoovers Industry"] || "",
      isHeadquarters: row["Is Headquarters"] === "true",
      naicsDescription: row["NAICS 2022 Description"] || "",
      ownership: row["Ownership Type"] || "",
      ticker: row["Ticker"] || "",
      employeesSite: row["Employees (Single Site)"] || "",
      sicDescription: row["US 8-Digit SIC Description"] || "",
    }))
    .filter(Boolean);
};

export const formatSales = (sales: string): string => {
  if (!sales) return 'N/A';
  
  const num = parseFloat(sales);
  if (isNaN(num)) return 'N/A';
  
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(1)}M`;
  } else {
    return `$${num.toLocaleString()}`;
  }
};

export const getUniqueIndustries = (companies: { industry?: string }[]) => {
  const industries = new Set<string>();

  companies.forEach((company) => {
    if (company.industry) {
      industries.add(company.industry);
    }
  });
  
  return Array.from(industries).sort();
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if it's a 10-digit number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};
