/**
 * Seed Script — Populate Artifacts Collection
 * 
 * Run: node seedArtifacts.js
 * 
 * This will insert sample Egyptian artifacts into the database
 * so that Favorites can populate artifact details (name, image, etc.)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Artifact = require("./models/Artifact");

const artifacts = [
  {
    name: "Mask of Tutankhamun",
    description: "The golden funerary mask of Pharaoh Tutankhamun, one of the most famous artifacts in the world. Made of 11 kg of solid gold, it was discovered in 1925 by Howard Carter in the Valley of the Kings.",
    era: "New Kingdom (18th Dynasty, c. 1323 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/CairoEgMuseum-TutijsMask.jpg/440px-CairoEgMuseum-TutijsMask.jpg"
  },
  {
    name: "Rosetta Stone",
    description: "A granodiorite stele inscribed with three versions of a decree issued in Memphis in 196 BC. It was the key to deciphering Egyptian hieroglyphs.",
    era: "Ptolemaic Period (196 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/440px-Rosetta_Stone.JPG"
  },
  {
    name: "Great Sphinx of Giza",
    description: "A limestone statue of a mythical creature with the head of a human and the body of a lion. It is the oldest known monumental sculpture in Egypt.",
    era: "Old Kingdom (c. 2558 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Great_Sphinx_of_Giza_-_20080716a.jpg/600px-Great_Sphinx_of_Giza_-_20080716a.jpg"
  },
  {
    name: "Bust of Nefertiti",
    description: "A painted stucco-coated limestone bust of Nefertiti, the Great Royal Wife of Pharaoh Akhenaten. It is one of the most copied works of ancient Egypt.",
    era: "New Kingdom (18th Dynasty, c. 1345 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Nofretete_Neues_Museum.jpg/440px-Nofretete_Neues_Museum.jpg"
  },
  {
    name: "Statue of Khafre",
    description: "A life-size diorite statue of Pharaoh Khafre, enthroned with the Horus falcon behind his head. Found in the Valley Temple near the Sphinx.",
    era: "Old Kingdom (4th Dynasty, c. 2570 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Khafre_statue.jpg/440px-Khafre_statue.jpg"
  },
  {
    name: "Canopic Jars of Tutankhamun",
    description: "Four miniature gold coffins that held the mummified viscera of Tutankhamun. Each jar was protected by one of the four sons of Horus.",
    era: "New Kingdom (18th Dynasty, c. 1323 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Tutankhamun_canopic_coffins.jpg/440px-Tutankhamun_canopic_coffins.jpg"
  },
  {
    name: "Narmer Palette",
    description: "A significant Egyptian archaeological artifact dating from about the 31st century BC. It is thought to depict the unification of Upper and Lower Egypt under King Narmer.",
    era: "Early Dynastic Period (c. 3100 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Narmer_Palette%2C_Egypt%2C_c._3100_BC_-_Royal_Ontario_Museum_-_DSC09726.JPG/440px-Narmer_Palette%2C_Egypt%2C_c._3100_BC_-_Royal_Ontario_Museum_-_DSC09726.JPG"
  },
  {
    name: "Book of the Dead",
    description: "An ancient Egyptian funerary text used from the beginning of the New Kingdom. It consists of magic spells intended to assist the deceased's journey through the Duat (underworld).",
    era: "New Kingdom (c. 1550–1050 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/BD_Hunefer.jpg/700px-BD_Hunefer.jpg"
  },
  {
    name: "Colossi of Memnon",
    description: "Two massive stone statues of Pharaoh Amenhotep III, which have stood in the Theban necropolis since 1350 BC. Each statue is about 18 meters tall.",
    era: "New Kingdom (18th Dynasty, c. 1350 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Colossi_of_Memnon_%28May_2002%29.jpg/600px-Colossi_of_Memnon_%28May_2002%29.jpg"
  },
  {
    name: "Statue of Rahotep and Nofret",
    description: "Painted limestone statues of Prince Rahotep and his wife Nofret, famous for their vivid colors and lifelike crystal eyes. Found at Meidum.",
    era: "Old Kingdom (4th Dynasty, c. 2610 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Rahotep_and_Nofret_statues.jpg/440px-Rahotep_and_Nofret_statues.jpg"
  },
  {
    name: "Scarab Amulet",
    description: "The scarab beetle was one of the most popular amulets in ancient Egypt. It symbolized the god Khepri and was associated with rebirth and the sun.",
    era: "Various periods",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Egypte_louvre_091.jpg/440px-Egypte_louvre_091.jpg"
  },
  {
    name: "Ankh Symbol Artifact",
    description: "The Ankh is an ancient Egyptian hieroglyphic symbol meaning 'life'. It was used by the gods and pharaohs as a symbol of eternal life.",
    era: "Various periods",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Ankh.svg/440px-Ankh.svg.png"
  },
  {
    name: "Statue of Anubis",
    description: "The jackal-headed god Anubis was the deity associated with mummification and the afterlife. Statues of Anubis were placed in tombs to guard the dead.",
    era: "New Kingdom (c. 1550–1070 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Tutankhamun_jackal.jpg/440px-Tutankhamun_jackal.jpg"
  },
  {
    name: "Obelisk of Hatshepsut",
    description: "A massive granite obelisk erected by Queen Hatshepsut at Karnak Temple. It stands approximately 29 meters tall and weighs about 323 tonnes.",
    era: "New Kingdom (18th Dynasty, c. 1457 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Karnak_Hatshepsut_obelisk.jpg/440px-Karnak_Hatshepsut_obelisk.jpg"
  },
  {
    name: "Mummy of Ramesses II",
    description: "The well-preserved mummy of Pharaoh Ramesses II (Ramesses the Great), one of Egypt's most powerful and celebrated pharaohs who ruled for 66 years.",
    era: "New Kingdom (19th Dynasty, c. 1213 BC)",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Ramesses_II_mummy.jpg/440px-Ramesses_II_mummy.jpg"
  }
];

async function seedArtifacts() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check existing count
    const existingCount = await Artifact.countDocuments();
    console.log(`📦 Existing artifacts in DB: ${existingCount}`);

    if (existingCount > 0) {
      console.log("\n⚠️  Artifacts already exist. Choose an option:");
      console.log("  1. Run with --force to delete all and re-seed");
      console.log("  2. Run with --append to add missing artifacts only\n");

      const arg = process.argv[2];

      if (arg === "--force") {
        console.log("🗑️  Deleting all existing artifacts...");
        await Artifact.deleteMany({});
        console.log("✅ Cleared all artifacts");
      } else if (arg === "--append") {
        console.log("📌 Appending mode — will skip artifacts that already exist by name...");
        let added = 0;
        for (const artifact of artifacts) {
          const exists = await Artifact.findOne({ name: artifact.name });
          if (!exists) {
            await Artifact.create(artifact);
            console.log(`  ✅ Added: ${artifact.name}`);
            added++;
          } else {
            console.log(`  ⏭️  Skipped (exists): ${artifact.name}`);
          }
        }
        console.log(`\n🎉 Done! Added ${added} new artifact(s).`);
        const finalCount = await Artifact.countDocuments();
        console.log(`📦 Total artifacts in DB: ${finalCount}`);
        await mongoose.disconnect();
        return;
      } else {
        console.log("❌ Aborted. Use --force or --append flag.");
        await mongoose.disconnect();
        return;
      }
    }

    // Insert all artifacts
    console.log("📥 Inserting artifacts...");
    const inserted = await Artifact.insertMany(artifacts);
    console.log(`✅ Successfully inserted ${inserted.length} artifacts:\n`);

    inserted.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name} (ID: ${a._id})`);
    });

    const finalCount = await Artifact.countDocuments();
    console.log(`\n📦 Total artifacts in DB: ${finalCount}`);
    console.log("\n🎉 Seeding complete! Favorites will now populate correctly.");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
    process.exit(1);
  }
}

seedArtifacts();
