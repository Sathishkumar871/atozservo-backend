const services = [
  {
    name: "AC Repair",
    category: "Home Services",
    description: "Quick and reliable air conditioner repair service at your doorstep.",
    image: "https://ik.imagekit.io/pimx50ija/IMG_20250711_122204.jpg?updatedAt=1752219016021",
    tags: ["ac", "repair", "cooling", "technician"]
  },
  {
    name: "Electrician",
    category: "Home Services",
    description: "Switches, wiring, and other electrical works.",
    image: "https://ik.imagekit.io/pimx50ija/IMG_20250711_122620.jpg?updatedAt=1752219015865",
    tags: ["electric", "wiring", "fan", "switch"]
  },
  {
    name: "Plumber",
    category: "Home Services",
    description: "Tap, bathroom fittings, and pipe leakage services.",
    image: "https://ik.imagekit.io/pimx50ija/photo.1.avif?updatedAt=1752215928944",
    tags: ["plumber", "leakage", "pipe", "fittings"]
  },
  {
    name: "Tiffin Service",
    category: "Food & Catering",
    description: "Homemade meals delivered daily.",
    image: "https://example.com/images/tiffin.jpg",
    tags: ["tiffin", "meals", "home food"]
  },
  {
    name: "Bridal Makeup",
    category: "Beauty & Grooming",
    description: "Professional bridal makeup for special occasions.",
    image: "https://ik.imagekit.io/pimx50ija/woman-7048766_1280.jpg?updatedAt=1752219015840",
    tags: ["makeup", "wedding", "bride", "beauty"]
  },
  {
    name: "Haircut at Home",
    category: "Beauty & Grooming",
    description: "Salon-style haircut and grooming services at home.",
    image: "https://ik.imagekit.io/pimx50ija/barber-shop-6797761_1280.jpg?updatedAt=1752219016321",
    tags: ["haircut", "barber", "grooming"]
  },
  {
    name: "Laptop Repair",
    category: "Gadget Repair",
    description: "Laptop screen, battery, and OS issues fixed.",
    image: "https://ik.imagekit.io/pimx50ija/technician-5508210_1280.jpg?updatedAt=1752219015752",
    tags: ["laptop", "repair", "screen", "battery"]
  },
  {
    name: "Mobile Repair",
    category: "Gadget Repair",
    description: "Mobile phone repairs including screen and charging issues.",
    image: "https://ik.imagekit.io/pimx50ija/work-8304180_1280.jpg?updatedAt=1752219015675",
    tags: ["mobile", "repair", "android", "iphone"]
  },
  {
    name: "CCTV Installation",
    category: "Security Services",
    description: "Install CCTV cameras for home and office security.",
    image: "https://ik.imagekit.io/pimx50ija/cctv-2417559_1280.jpg?updatedAt=1752219015628",
    tags: ["cctv", "camera", "security"]
  },
  {
    name: "Painter",
    category: "Home Services",
    description: "Interior and exterior painting by professionals.",
    image: "https://ik.imagekit.io/pimx50ija/brush-1034901_1280.jpg?updatedAt=1752219013108",
    tags: ["paint", "color", "wall", "home"]
  },
  {
    name: "Pest Control",
    category: "Home Services",
    description: "Anti-termite, cockroach, and mosquito treatments.",
    image: "https://example.com/images/pest.jpg",
    tags: ["pest", "cockroach", "mosquito", "bugs"]
  },
  {
    name: "Bike Mechanic",
    category: "Vehicle Services",
    description: "Bike repair and maintenance services.",
    image: "https://ik.imagekit.io/pimx50ija/motorbike-257988_1280.jpg?updatedAt=1752219010744",
    tags: ["bike", "repair", "mechanic"]
  },
  {
    name: "Car Wash",
    category: "Vehicle Services",
    description: "Exterior and interior cleaning of cars.",
    image: "https://ik.imagekit.io/pimx50ija/auto-1822415_1280.jpg?updatedAt=1752219012959",
    tags: ["car", "wash", "cleaning"]
  },
  {
    name: "Interior Designer",
    category: "Interior & Furniture",
    description: "Home and office interior planning and design.",
    image: "https://ik.imagekit.io/pimx50ija/kitchen-2174593_1280.jpg?updatedAt=1752219011821",
    tags: ["interior", "furniture", "modular"]
  },
  {
    name: "Epoxy Dining Table",
    category: "Interior & Furniture",
    description: "Custom epoxy resin dining table making.",
    image: "https://example.com/images/epoxy.jpg",
    tags: ["epoxy", "furniture", "dining"]
  },
  {
    name: "Marriage Profile - Bride",
    category: "Marriage Match",
    description: "Register bride profile for local marriage matches.",
    image: "https://ik.imagekit.io/pimx50ija/indian-4160039_1280.jpg?updatedAt=1752219012176",
    tags: ["marriage", "bride", "profile"]
  },
  {
    name: "Marriage Profile - Groom",
    category: "Marriage Match",
    description: "Register groom profile for local marriage matches.",
    image: "https://example.com/images/groom.jpg",
    tags: ["marriage", "groom", "profile"]
  },
  {
    name: "Photographer",
    category: "Event Services",
    description: "Wedding and event photography.",
    image: "https://ik.imagekit.io/pimx50ija/camera-7726802_1280.jpg?updatedAt=1752219011515",
    tags: ["photo", "wedding", "camera"]
  },
  {
    name: "Tent & Chairs",
    category: "Event Services",
    description: "Tent, chairs, tables rental for events.",
    image: "https://example.com/images/tent.jpg",
    tags: ["tent", "chairs", "tables", "event"]
  },
  {
    name: "Sound System Rent",
    category: "Event Services",
    description: "DJ sound systems and speaker setup.",
    image: "https://ik.imagekit.io/pimx50ija/mixer-4197733_1280.jpg?updatedAt=1752219012014",
    tags: ["dj", "sound", "rent"]
  },
  {
    name: "Doctor On Call",
    category: "Medical Services",
    description: "Doctor home visit service.",
    image: "https://ik.imagekit.io/pimx50ija/IMG_20250711_125601.jpg?updatedAt=1752219007201",
    tags: ["doctor", "home", "visit"]
  },
  {
    name: "Nurse at Home",
    category: "Medical Services",
    description: "Nursing services at your location.",
    image: "https://ik.imagekit.io/pimx50ija/nurse-2019420_1280.jpg?updatedAt=1752219010966",
    tags: ["nurse", "homecare", "injection"]
  },
  {
    name: "Typing / Xerox",
    category: "Document Services",
    description: "Xerox, typing, printout and lamination.",
    image: "https://example.com/images/xerox.jpg",
    tags: ["xerox", "print", "scan", "lamination"]
  },
  {
    name: "Resume Maker",
    category: "Job Support",
    description: "Professional resume and CV designing.",
    image: "https://example.com/images/resume.jpg",
    tags: ["resume", "cv", "career"]
  },
  {
    name: "Online Tuition",
    category: "Education",
    description: "Online tuition for school/college subjects.",
    image: "https://ik.imagekit.io/pimx50ija/man-791049_1280.jpg?updatedAt=1752219011076",
    tags: ["tuition", "education", "online"]
  }
];

module.exports = services;