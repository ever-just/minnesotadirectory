export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface Company {
  name: string;
  tradestyle: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  url: string;
  sales: string;
  employees: string;
  description: string;
  industry: string;
  isHeadquarters: boolean;
  naicsDescription: string;
  rawSales?: string;
  ownership?: string;
  ticker?: string;
  employeesSite?: string;
  sicDescription?: string;
  contacts: Contact[];
}

export interface IndustryOption {
  value: string;
  label: string;
}
