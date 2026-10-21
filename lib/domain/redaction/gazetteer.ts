// Static, deterministic gazetteer of public Indian place names used ONLY to anchor address detection
// ("<place>[,] <PIN>"). Public place names are not personal data. Not exhaustive by design: the non-gazetteer
// comma+PIN rule in redact.ts remains as a fallback.

/** All 28 states and 8 union territories (plus common alternate spellings). */
export const IN_STATES_AND_UTS: readonly string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Orissa", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "Uttaranchal", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "New Delhi",
  "NCT of Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry", "Pondicherry",
];

/** Major cities and district headquarters (common English spellings). */
export const IN_CITIES: readonly string[] = [
  "Mumbai", "Bombay", "Navi Mumbai", "Thane", "Pune", "Nagpur", "Nashik", "Aurangabad", "Chhatrapati Sambhajinagar",
  "Solapur", "Kolhapur", "Amravati", "Nanded", "Sangli", "Jalgaon", "Akola", "Latur", "Ahmednagar", "Satara",
  "Delhi", "New Delhi", "Noida", "Greater Noida", "Gurugram", "Gurgaon", "Faridabad", "Ghaziabad", "Sonipat",
  "Panipat", "Karnal", "Ambala", "Rohtak", "Hisar", "Panchkula", "Yamunanagar",
  "Bengaluru", "Bangalore", "Mysuru", "Mysore", "Mangaluru", "Mangalore", "Hubballi", "Hubli", "Dharwad", "Belagavi",
  "Belgaum", "Kalaburagi", "Gulbarga", "Davanagere", "Ballari", "Bellary", "Shivamogga", "Shimoga", "Tumakuru",
  "Udupi", "Vijayapura",
  "Chennai", "Madras", "Coimbatore", "Madurai", "Tiruchirappalli", "Trichy", "Salem", "Tirunelveli", "Erode",
  "Vellore", "Thoothukudi", "Tuticorin", "Thanjavur", "Dindigul", "Tiruppur", "Kanchipuram", "Hosur", "Nagercoil",
  "Hyderabad", "Secunderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam",
  "Visakhapatnam", "Vizag", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Rajahmundry",
  "Rajamahendravaram", "Anantapur", "Kadapa", "Eluru", "Ongole",
  "Kolkata", "Calcutta", "Howrah", "Durgapur", "Asansol", "Siliguri", "Kharagpur", "Bardhaman", "Haldia",
  "Kochi", "Cochin", "Ernakulam", "Thiruvananthapuram", "Trivandrum", "Kozhikode", "Calicut", "Thrissur", "Kollam",
  "Kannur", "Palakkad", "Alappuzha", "Kottayam", "Malappuram",
  "Ahmedabad", "Surat", "Vadodara", "Baroda", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh", "Anand",
  "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bhilwara", "Sikar",
  "Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj", "Allahabad", "Meerut", "Bareilly", "Aligarh", "Moradabad",
  "Gorakhpur", "Jhansi", "Mathura", "Saharanpur", "Firozabad", "Ayodhya",
  "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna",
  "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia",
  "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh",
  "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri",
  "Raipur", "Bhilai", "Bilaspur", "Durg", "Korba",
  "Chandigarh", "Mohali", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda",
  "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rishikesh",
  "Shimla", "Dharamshala", "Mandi", "Solan",
  "Srinagar", "Jammu", "Leh",
  "Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur",
  "Shillong", "Imphal", "Aizawl", "Kohima", "Dimapur", "Agartala", "Itanagar", "Gangtok",
  "Panaji", "Margao", "Vasco da Gama",
  "Puducherry", "Pondicherry", "Port Blair", "Kavaratti", "Silvassa", "Daman", "Diu",
];
