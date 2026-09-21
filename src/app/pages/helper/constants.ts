export const businessTypes = [
  { id: "manufacturing", label: "Manufacturing" },
  { id: "retail", label: "Retail" },
  { id: "wholesale", label: "Wholesale" },
  { id: "service", label: "Service" },
  { id: "agriculture", label: "Agriculture" },
  { id: "technology", label: "Technology" },
  { id: "healthcare", label: "Healthcare" },
  { id: "education", label: "Education" },
  { id: "other", label: "Other" },
];

export const employeeSizes = [
  { id: "1-10", label: "1-10 Employees" },
  { id: "11-50", label: "11-50 Employees" },
  { id: "51-100", label: "51-100 Employees" },
  { id: "101-500", label: "101-500 Employees" },
  { id: "500+", label: "500+ Employees" },
];

export const countries = [{ id: "in", label: "India" }];

export const statesByCountry: Record<string, { id: string; label: string }[]> = {
  in: [
    { id: "mh", label: "Maharashtra" },
    { id: "gj", label: "Gujarat" },
    { id: "ka", label: "Karnataka" },
    { id: "dl", label: "Delhi" },
  ],
};

export const districtsByState: Record<string, { id: string; label: string }[]> = {
  mh: [
    { id: "pune", label: "Pune" },
    { id: "mumbai", label: "Mumbai" },
    { id: "nagpur", label: "Nagpur" },
  ],
  gj: [
    { id: "ahmedabad", label: "Ahmedabad" },
    { id: "surat", label: "Surat" },
  ],
  ka: [
    { id: "bengaluru", label: "Bengaluru" },
    { id: "mysuru", label: "Mysuru" },
  ],
  dl: [{ id: "new-delhi", label: "New Delhi" }],
};

export const talukasByDistrict: Record<string, { id: string; label: string }[]> = {
  pune: [
    { id: "haveli", label: "Haveli" },
    { id: "mulshi", label: "Mulshi" },
    { id: "bhor", label: "Bhor" },
  ],
  mumbai: [
    { id: "andheri", label: "Andheri" },
    { id: "dadar", label: "Dadar" },
  ],
  nagpur: [
    { id: "nagpur-rural", label: "Nagpur Rural" },
    { id: "kamptee", label: "Kamptee" },
  ],
  ahmedabad: [
    { id: "daskroi", label: "Daskroi" },
    { id: "sanand", label: "Sanand" },
  ],
  surat: [
    { id: "choryasi", label: "Choryasi" },
    { id: "kamrej", label: "Kamrej" },
  ],
  bengaluru: [
    { id: "bangalore-north", label: "Bangalore North" },
    { id: "bangalore-south", label: "Bangalore South" },
  ],
  mysuru: [
    { id: "mysuru-taluk", label: "Mysuru" },
    { id: "nanjangud", label: "Nanjangud" },
  ],
  "new-delhi": [
    { id: "central", label: "Central Delhi" },
    { id: "south", label: "South Delhi" },
  ],
};
