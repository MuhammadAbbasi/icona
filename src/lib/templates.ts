// AUTO-GENERATED from template_data/BOQ-UBL JOHI.xlsx by scripts/extract-boq-template.py
// Do not edit by hand. Re-run: python scripts/extract-boq-template.py
// Quantities are intentionally omitted — templates carry unit + rate only.

export interface TemplateSubtask { title: string; unit: string | null; rate: number | null; }
export interface TemplateTask { title: string; subtasks: TemplateSubtask[]; }
export interface TemplateDomain { key: string; label: string; aliases: string[]; tasks: TemplateTask[]; }

export const BOQ_TEMPLATE: TemplateDomain[] = [
  {
    "key": "civil",
    "label": "Civil Works",
    "aliases": [
      "civil",
      "structural",
      "architect"
    ],
    "tasks": [
      {
        "title": "1 Dismantling / Demolition of Existing Structure",
        "subtasks": [
          {
            "title": "Dismantling / removing /Demolition of existing constructed structures, fixtures, tools & equipment's with all necessary precautionary measures, stacking useable dismantled materials at designated place and disposal of surplus stuff etc. from site, (block masonry, RCC slab, dado/ floor tiles, existing ground floor, wooden/ glass door, windows, plaster, wooden partition, aluminum tile, false ceiling, roller shutter, AC / Electrical / Plumbing or any other item which is required to be demolished / removed but not mentioned above) Dismantling also includes shutter, cutting in slab for new staircase and external dismantling what ever required **Dismantling material can be utilized for backfilling where required with the approval of structural Engineer. Dismantling of Existing Mezzanine Floor including shifting of rubble etc. ** Note: Visit site to ascertain the quantum of dismentling works and quote justifiable price rates for the items.(Survey report attached) (Including dismantling of existing Staircase)",
            "unit": "Job",
            "rate": 150000.0
          }
        ]
      },
      {
        "title": "2 Excavation Works in trenches for masonry walls or below base slab of strong/locker rooms whereever required as per Engineer instructions.",
        "subtasks": [
          {
            "title": "2 Excavation Works in trenches for masonry walls or below base slab of strong/locker rooms whereever required as per Engineer instructions.",
            "unit": "Cft",
            "rate": null
          }
        ]
      },
      {
        "title": "3 Backfilling ghassu Soil where ever required as per instructions with proper compcation by using manual Tamper.",
        "subtasks": [
          {
            "title": "3 Backfilling ghassu Soil where ever required as per instructions with proper compcation by using manual Tamper.",
            "unit": "Cft",
            "rate": null
          }
        ]
      },
      {
        "title": "4 Providing and laying 6\" thick stone soling/hard core/Brick ballast using max 2.5\" size crushed or hand broken stone/brick in sub base/under floors (where ever required) with proper watering and compaction complete in all respect as per satifactory works. (Below base slab of locker/ vault, Below PCC in washroom area or as per Engineer instructions)",
        "subtasks": [
          {
            "title": "4 Providing and laying 6\" thick stone soling/hard core/Brick ballast using max 2.5\" size crushed or hand broken stone/brick in sub base/under floors (where ever required) with proper watering and compaction complete in all respect as per satifactory works. (Below base slab of locker/ vault, Below PCC in washroom area or as per Engineer instructions)",
            "unit": "Cft",
            "rate": null
          }
        ]
      },
      {
        "title": "5 PCC Works",
        "subtasks": [
          {
            "title": "Providing & laying 3\" to 4\" PCC (1:2:4) under any type of flooring, preparation of supporting pads, roof screed works, ramps etc whereever required using best Quality OPC, approved quality sand and crushed stone (plant), form work and its removal, with necessary arrangements complete in all respects as per approval of Bank's Engineer. Material should be as per Approved Manufacturer/Vendors/Sources list or equivalent as approved by Bank's Engineer. Cement: Falcon, Lucky Pakland, D.G Cement, best way or equivalent Sand: Hyderabad Bolari /Malir River/Hub or equivalent Crush: Hub 3/4\" and Kot Banglo or equivalent (Whole Floor)",
            "unit": "Sft",
            "rate": 360.0
          },
          {
            "title": "Providing & laying PCC (1:2:4) under any type of flooring, preparation of supporting pads, roof screed works, ramps etc whereever required using best Quality OPC, approved quality sand and crushed stone (plant), form work and its removal, with necessary arrangements complete in all respects as per approval of Bank's Engineer. Material should be as per Approved Manufacturer/Vendors/Sources list or equivalent as approved by Bank's Engineer. Cement: Falcon, Lucky Pakland, D.G Cement, best way or equivalent Sand: Hyderabad Bolari /Malir River/Hub or equivalent Crush: Hub 3/4\" and Kot Banglo or equivalent (For only GENSET PAD or as per Engineer Instructions)",
            "unit": "Sft",
            "rate": 460.0
          }
        ]
      },
      {
        "title": "6 RCC Works",
        "subtasks": [
          {
            "title": "6.1 RCC Vault & Locker Room Walls",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and laying, compacting finishing & curing etc. straight or curved cast- in place designed mix 1:2:4 Reinforced Cement Concrete using 1 Part of Ordinary Portland Cement, 2 Parts of silt free local sand and 4 Parts of 3/4\" thick down graded crushed stone; mixed in a manner to achieve a cube strength of 3000 psi, using 3/4\" down crush stone & fine sand (free from silt & dust), including mechanical mixing, transporting, hoisting, lifting & placing at any height / depth, vibrating and curing etc. Complete in all respect including cost of Steel Reinforcement (3/8\" dia deformed steel bars G-60 @ 6\" C/C both ways, staggered double jaal in a manner that the alternate spacing b/w bars should not increase/decrease 3'' C/C) & form work for Cement Concrete including cutting, bending, laying in position, making joint and fastening, removal of rust from bars, cost of binding wire and labour charges for binding of steel reinforcement: also includes cost of water tight form work and its removal. Complete in all respects, as per direction of Engineer. Steel: Amreli Steels",
            "unit": null,
            "rate": null
          },
          {
            "title": "6\" thick RCC wall with double reinfocement as shown in manual Dwg. 59 with 3/8\" dia deformed steel bars G-60 @ 6\" C/C both ways, staggered double jaal in a manner that the alternate spacing b/w bars should not increase 3'' C/C.",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "8\" thick RCC wall with double reinfocement with 3/8\" dia deformed steel bars G-60 @ 6\" C/C both ways, staggered double jaal in a manner that the alternate spacing b/w bars should not increase 3'' C/C.",
            "unit": "Sft",
            "rate": 1210.0
          },
          {
            "title": "6\" Thick RCC (1:2:4) Slab with #3 bars @ 6\" c/c double Jall (T&B) both ways (Staggered). (Top and Bottom Slab Both) (Above Vault/Locker and outside Drain)",
            "unit": "sft",
            "rate": 1190.0
          },
          {
            "title": "6\" thick RCC flight Slab (1:2:4) i/c CC Steps of stair case whereever required with rienforcement details as #3 deformed bars@6\" c/c both ways (T&B) complete in all respect. (Only surface flight slab area will paid in measurment.)",
            "unit": "sqft",
            "rate": null
          },
          {
            "title": "6\" thick RCC flight Slab (1:2:4) i/c CC Steps (5\"Rx15\"T)of stair case whereever required with rienforcement details as #3 deformed bars@6\" c/c (T&B) and #4 deformed horizontal main bars (Top & Bottom) complete in all respect. (Only surface flight slab area will paid in measurment.)",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "R.C.C Lintels/R.C.C Beams in front walls, windows etc 4#4 main bars with #3@6\"c/c stirrups of deformed steel using (1;2:4) ration concrete of 3000psi compressive strength at 28 days.",
            "unit": "Rft",
            "rate": 1050.0
          },
          {
            "title": "6.6 Slab on Grid (SOG); Providing and laying, compacting finishing & curing etc. 1:2:4 Reinforced Cement Concrete Floor (3\" TO 4\") using 1 Part of SR Cement, 2 Parts of silt free local sand and 4 Parts of 3/4\" thick down graded crushed stone; mixed in a manner to achieve a cube strength of 3000 psi in 28 days, using 3/4\" down crush stone & fine sand (free from silt & dust), including mixing, transporting, hoisting, lifting & placing at any height / depth, vibrating and curing etc. Complete in all respect including cost of Steel Reinforcement (3/8\" dia deformed steel bars G-60 @ 12\" C/C both ways) & form work for Cement Concrete including cutting, bending, laying in position, making joint and fastening, removal of rust from bars, cost of binding wire and labour charges : also includes cost of water tight form work and its removal complete in all respects,",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "C.C Steps & C.C landing to modify the existing Stair & Construction of Steps infront of Branch as per Instructions and approved design/layout during execution Complete in all respect except granite works",
            "unit": "No",
            "rate": null
          }
        ]
      },
      {
        "title": "7 RCC Beams & Lintels",
        "subtasks": [
          {
            "title": "7.1 R.C.C Lintels/R.C.C Beams in front walls for window sills etc with 4#4 main deformed bars (3Top & 3 Bottom) with #2 deformed bars@ 6\"c/c stirrups of deformed steel using (1:2:4) ration concrete of 3000psi compressive strength at 28 days.",
            "unit": "Cft",
            "rate": null
          }
        ]
      },
      {
        "title": "8 Block / Brick Masonry works.",
        "subtasks": [
          {
            "title": "Providing & laying Block / Class A Brick masonry walls including racking of joints with 1:4 cement sand mortar, the job includes fixing of 6\" long steel knails or L shape Hole passes at every 3' in height to connect the new wall with old wall or exisiting columns whereever required include proper compacted base below masonry walls also includes 3\" thick (1:2:4) base having 2#3 linear bars complete in all respect to the satisfaction of Architect / Bank's Engineer.",
            "unit": null,
            "rate": null
          },
          {
            "title": "4\" thick Block Masonry (First class Machine made Blocks of 1000psi c.strength) as approved by Bank's Engineer (For All Internal Walls)",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "6\" thick Block Masonry (First class Machine made Blocks of 1000psi c.strength) as approved by Bank's Engineer",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "8\" thick Block Masonry (First class Machine made Blocks of 1000psi c.strength) as approved by Bank's Engineer (For Boundary Wall)",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "4\" thick Block Masonry (First class Machine made Blocks of 1000psi c.strength) as approved by Bank's Engineer (For Parapet Walls)",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "4.5\" thick Brick Masonry (First class Bricks as approved by Bank's Engineer)",
            "unit": "Sft",
            "rate": 170.0
          },
          {
            "title": "9\" thick Brick Masonry (First class Bricks as approved by Bank's Engineer)",
            "unit": "Sft",
            "rate": 262.0
          },
          {
            "title": "Brick Masonry for making of steps for emergency exit (First class Bricks as approved by Bank's Engineer) including using steel pins (2 Nos) for each step and 4 Nos for landing) including plaster etc. complete in all respects",
            "unit": "Cft",
            "rate": 481.5
          }
        ]
      },
      {
        "title": "9 Plaster Works.",
        "subtasks": [
          {
            "title": "Providing & laying 1\" thick cement sand Kachha plaster ( Internal / External ) with 1:4 cement sand mortar on walls, columns, beams, using best quality O.P.C and approved sand. (Only when required on old wall/ columns etc. as per satisfaction of Architect / Bank's Engineer) (Note: New Brick masonry works requires katcha plaster on one side only however block masonry donot requires katcha plaster) Cement: Maple leaf OPC, Bestway Cement, Cherat Cement. Paidar Cement. Poineer Cement OPC, Poineer Cement SR, Falcon, Lucky Pakland, D.G Cement or equivalent as approved by Bank's Engineer Sand: Hyderabad Bolari /Malir River/Hub/Chenab",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "Providing & laying 3/4\" thick cement sand plaster (Internal) with 1:4 cement sand mortar on walls, columns, beams, using best quality O.P.C & approved sand, including 6\" inches wide mesh at joints of structure with block masonry and over conduiting, smooth trowel finish complete in all respect. (This includes all the base plaster require for making diagonal and alignment for the existing walls) as per satisfaction of Architect / Bank's Engineer. Cement: Falcon, Lucky Pakland, D.G,Bestway Cement or equivalent as approved by Bank's Engineer Sand: Hyderabad Bolari /Malir River/Hub/Chenab",
            "unit": "Sft",
            "rate": 83.46000000000001
          },
          {
            "title": "Providing & laying 3/4\" thick cement sand plaster (Internal Slab and Beams in Center) with 1:4 cement sand mortar on walls, columns, beams, using best quality O.P.C & approved sand, including 6\" inches wide mesh at joints of structure with block masonry and over conduiting, smooth trowel finish complete in all respect. (This includes all the base plaster require for making diagonal and alignment for the existing walls) as per satisfaction of Architect / Bank's Engineer. Cement: Falcon, Lucky Pakland, D.G,Bestway Cement or equivalent as approved by Bank's Engineer Sand: Hyderabad Bolari /Malir River/Hub/Chenab",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "Providing & laying 3/4\" thick cement sand plaster (External) with 1:4 cement sand mortar on walls, columns, beams, using best quality O.P.C & approved sand, including 6\" inches wide mesh at joints of structure with block masonry and over conduiting, smooth trowel finish complete in all respect. (This includes all the base plaster require for making diagonal and alignment for the existing walls) as per satisfaction of Architect / Bank's Engineer. Cement: Falcon, Lucky Pakland, D.G,Bestway Cement or equivalent as approved by Bank's Engineer Sand: Hyderabad Bolari /Malir River/Hub/Chenab",
            "unit": "Sft",
            "rate": 94.16
          },
          {
            "title": "Plaster with SBR Admixture; Providing & laying 3/4\" thick cement sand plaster with admixture of SBR as per approved ratio (Basement external walls) with 1:4 cement sand mortar on walls, columns, beams, using best quality O.P.C & approved sand, including 6\" inches wide mesh at joints of structure with block masonry and over conduiting, smooth trowel finish complete in all respect. (This includes all the base plaster require for making diagonal and alignment for the existing walls) as per satisfaction of Architect / Bank's Engineer. Cement: Falcon, Lucky Pakland, D.G,Bestway Cement or equivalent as approved by Bank's Engineer Sand: Hyderabad Bolari /Malir River/Hub/Chenab",
            "unit": "Sft",
            "rate": null
          }
        ]
      },
      {
        "title": "10 Flooring & Special Finishes.",
        "subtasks": [
          {
            "title": "Porcelain Floor Tiles",
            "unit": null,
            "rate": null
          },
          {
            "title": "Tier I and Tier II, Flagship and Office Projects",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing/ Laying Imported (Roka Ceram) Grit Light Grey Matt floor tiles 24''x48''(600mmx1200mm) for branch flooring floor including 3\" thick levelled surface of cement sand (1:4) mortar and installation of tile with cement sand mortar/bond & grouting with matching grout material of Stile (Dark Grey), complete in all respects as per satisfaction of Bank's Engineer. Supplier M/s H.H Traders (Mr. Danish-0321 2491656) (Mr. Mohammad Owais- 03202949491) (Mr. Yahya-0321 2184825)",
            "unit": "Sft",
            "rate": 415.0
          },
          {
            "title": "Fixing of 4\" high skirting of same tiles at any height/any floor, complete in all respect as per satisfaction of Bank's Engineer.",
            "unit": "Rft",
            "rate": 260.0
          },
          {
            "title": "Tier III and Tier IV(Rural Area Branches only)",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing/ Laying Imported Chinese Grey Matt floor DC-14 tiles (24”x24”) supplied by M/s Master Tiles or M/s HH Traders for branch flooring in rural area branches including 3\" thick levelled surface of cement sand (1:4) mortar and installation of tile with 1:4 cement sand mortar/bond & grouting with matching grout material of Stile, complete in all respects as per satisfaction of Bank's Engineer. Supplier M/s Master Tiles (Mr. Zawar-02134124510/03306277440) M/s H.H Traders (Mr. Mohammad Owais- 03202949491)",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "Fixing of 4\" high skirting of same tiles at any height/any floor, complete in all respect as per satisfaction of Bank's Engineer.",
            "unit": "Rft",
            "rate": null
          }
        ]
      },
      {
        "title": "11 Elevation Tiles / ACP Cladding",
        "subtasks": [
          {
            "title": "Providing & fixing local wall Tiles (HH-106)of size 12\"x24\" (300mm x 600 mm) in Elevation # 16&17 of facility design manual for installtion details including 1:4 rough plaster, stuck with base coat of Dry bond or approved equivalent as per manuf , grouting in matching color, incl. Removal of existing plaster etc. to accommodate new finishes, including all cuttings, grouting, and making all details complete in all respect as per drawings and architects instructions.",
            "unit": "Sft",
            "rate": 480.0
          },
          {
            "title": "Fabricating, providing and Installation of 4 mm Aluminum Composite Panels for Cladding in standard MAT Silver color (at any level), consisting of heavy duty deluxe anodized frame with 2mm base thickness, including designing, cutting, panel making, scaffolding etc. Complete with substructure and framing of Seal Tuff in Black with requisite backer rod, Stiffners &Rivets. Brand: DADEX, ECL, Alpolic or equiavlent Refer Drawing on Page # 14 of Facility Design Manual",
            "unit": "Sft",
            "rate": 920.0
          }
        ]
      },
      {
        "title": "12 Washroom/Pantry Tiles (Walls & Floors)",
        "subtasks": [
          {
            "title": "Wall Tiles",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing & fixing local Wall Tiles (HH-106)of size 12\"x24\" (300mm x 600 mm) in walls with border of floor tiles as mentioned in facility design manual including 1:4 rough plaster, stuck with base coat of approved Dry bond, grouting in matching color also includes removal of existing plaster etc. to accommodate new finishes, including all cuttings, grouting, and making all details complete in all respect as per drawings and architect instructions.",
            "unit": "Sft",
            "rate": 410.0
          },
          {
            "title": "Floor Tiles",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing/ Laying Roka Ceram Grit Light Grey Matt floor tiles 12''x24''(600mmx1200mm) for Pantry/Washroom Flooring including 3\" thick 1:4 cement sand mortar for surfacing, grouting with matching grout material of Stile, with proper slope of floor tiles towards floor trap, complete in all respect as per satisfaction of Architect / Bank Engineer. Vendor has to arrange the required size floor tiles with laser cutting from supplier.",
            "unit": "Sft",
            "rate": 410.0
          }
        ]
      },
      {
        "title": "13 Granite Stair/Entrance Steps & Elevation",
        "subtasks": [
          {
            "title": "Providing and laying pre polished 3/4\" SEDO White Granite or equavalent approved by Architect of required quality and size on any type of flooring/Stair case steps/External Steps/Elevation wall, straight or curved, as per drawings, laid with cement slurry over cement sand mortar (1:4) or bond, including filling of joints with grouting material, complete in all respects.",
            "unit": null,
            "rate": null
          },
          {
            "title": "Elevation walls- (Refer Elevation drawing on Page No.16 &17 of Facility Design Manual)",
            "unit": "Sft",
            "rate": 540.0
          },
          {
            "title": "Stair Steps Treads/Risers (Refer Elevation drawing on Page No.16&17 of Facility Design Manual",
            "unit": "Sft",
            "rate": 1020.0
          },
          {
            "title": "6\" Granite in threshold of doors/sills",
            "unit": "rft",
            "rate": null
          }
        ]
      },
      {
        "title": "14 Pavements (Tuff Pavers)",
        "subtasks": [
          {
            "title": "Providing and laying concrete pavers of approved size and make over 3\" thick sand bedding. complete in all respects as per drawing and as shown in Facility Design Manual page no 72. Brand: Envicrete, I-Crete, Bannu or equivalent",
            "unit": "Sft",
            "rate": 290.0
          }
        ]
      },
      {
        "title": "15 P.C.C chequered Tiles",
        "subtasks": [
          {
            "title": "Providing & fixing 12\"X12\" P.C.C chequered Tiles over 3/4\" thick (average) base mortar @ 1:4 c/s mortar complete in all respect as per satisfaction of Bank's Engineer.",
            "unit": "Sft",
            "rate": null
          }
        ]
      },
      {
        "title": "16 Paint",
        "subtasks": [
          {
            "title": "Providing and applying at any height 03 coats of ICI matt finish enamel paint to wall, roller applied over one primer coat including rubbing or Scrapping , filling etc complete in all respects as per instructions and as directed by the Engineer. Grey Clouds 08GG 72/006 of ICI Oil Base Matt Enamel",
            "unit": "Sft",
            "rate": 90.0
          },
          {
            "title": "Providing and applying at any height 03 coats of Oil paint to Shutter & Grill over a base coat of red oxide complete in all respects as per instructions and as directed by the Engineer. ( paint will be calculted with one side) Grey Clouds Enamel",
            "unit": "Sft",
            "rate": 90.0
          },
          {
            "title": "Providing and applying at any height 03 coats of weather shield paint (ICI Sky Grey or Equiavlent)on external walls, roller applied over one primer coat including rubbing or Scrapping , filling etc complete in all respects as per instructions and as directed by the Engineer.",
            "unit": "Sft",
            "rate": 90.0
          },
          {
            "title": "Providing and applying Spray paint on Existing Vault and locker doors including grill doors",
            "unit": "Nos.",
            "rate": 9500.0
          }
        ]
      },
      {
        "title": "17 Wood Works.",
        "subtasks": [
          {
            "title": "Wooden Doors (All doors )",
            "unit": null,
            "rate": null
          },
          {
            "title": "17.1 Semi Solid Doors Providing and fixing in position design door shutter and frame (with or without vision panel) as per details given below including beech wood lipping, vision panel and other hardware with 3 coats of matching beech wood with original grains polish on lipping, frame and door as per approved drawing & satisfaction of Bank Engineer. (Including cost of SOLIGNUM Anti-Termite treatment) 1. Solid Beech wood Door Frame: 5.5” wide x 2” thick (Top head & both sides jambs) or of size as per site requirement and LOP. 2. Panel Beech wood frame details: 3” wide x2” thick Top Rails, 6.5”x 2” Bottom Rails & 3” x 2” thick Side Rails of solid beech wood 3. Panel Shutter: Panel shutter of required thickness having 3” wide beech wood slats of 0.25” thick with ¼” groove pasted on both facings over 1.5” thick imported approved MDF sheet BASE fixing properly with wooden epoxy. 4. Accessories: Oxidized Brass hinges, Brass screw, Khas door Locks (Triumph plus SA1072H or equivalent), 4” thick SS kick plates, Iron Hold Fast (4 Nos), Door Stopper, Khas door closure or equivalent etc complete in all respect.",
            "unit": null,
            "rate": null
          },
          {
            "title": "Size 3' - 6\" x 7' - 0\" overall both way openable (PWD Branch)",
            "unit": "No",
            "rate": null
          },
          {
            "title": "Size 2' - 6\" x 7' - 0\" overall",
            "unit": "No",
            "rate": null
          },
          {
            "title": "Size 3'-0\" x 7' - 0\" overall",
            "unit": "No",
            "rate": null
          },
          {
            "title": "17.2 Flush Doors Providing and fixing 4\" x 1.5'' thick Kel wood Jamb Top ,Bottom, Left and Right Rail, including 3 Kel wood Grids inside shutter frame with installation of ½” MDF on both sides as per Drawing and 5\" hinge and lock stiles with pressing of 3 to 2 mm ply wood panel sheet on front & back, With 3\"x5/8\" architectural beading/lipping, approved quality of oxidized brass hinges, brass screw, tower bolts, imported stainless steel Handle locks (Khas brand or equivalent ) and other hardware of brass including iron hold fasts, and 3 coats of matching Lacquer polish/enamel paint on leaf and Kel wood door frame (Chowkhat) of size 5” wide and 2” thick as per instructions of Architect/Engineer. It includes all door fixtures, Door locks, kick plate (for washrooms and kitchen) and hinges etc(Khas or Equivalent) as per requirement.",
            "unit": null,
            "rate": null
          },
          {
            "title": "Size 3' - 6\" x 7' - 0\" overall both way openable (PWD Branch)",
            "unit": "No",
            "rate": null
          },
          {
            "title": "Size 2' - 6\" x 7' - 0\" overall",
            "unit": "No",
            "rate": null
          },
          {
            "title": "Size 3'-0\" x 7' - 0\" overall",
            "unit": "No",
            "rate": 58000.0
          },
          {
            "title": "17.3 Supply & Installtion ofUPVC Doors (Skypen or equavlent) for washrooms & PVC louvers under kitchen top as per Approved design complete in all respect",
            "unit": "Sft",
            "rate": 2150.0
          }
        ]
      },
      {
        "title": "18 Wooden Cabinets",
        "subtasks": [
          {
            "title": "Filling Cabinet .",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing, fabricating and fixing in position filing cabinets consisting of 3/4\" thick laminated board (Base frame of Formite 7601 & shutter of formite 7180) box (back, side and shelves), shutter and drawers, with molding 1/2”x3/4” including nails, screws, bolts, hinges, catchers, imported steel glides, locks, handles, (Khas or equivalent) 3 coat of sprit polish of matching shade on lipping and wood preservative treatment and all other accessories complete in all respects as per drawings (54 of Design Manual) and as directed by the Bank's Engineer. (Including cost of Anti-Termite treatment)",
            "unit": null,
            "rate": null
          },
          {
            "title": "18\" Deep (Full height 7 ft high)",
            "unit": "sft",
            "rate": null
          },
          {
            "title": "18\" Deep ( Low Height 3 ft high )",
            "unit": "Rft",
            "rate": null
          },
          {
            "title": "Kitchen Cabinet",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and fixing in position hanging type open shelves; cabinet frame made up of 20mm thick mdf board pressed on both sides with Formite A Grade Lamination (Code: 7601), cabinet shutter made up of 20mm thick mdf board pressed on both sides with Formite A Grade Lamination (Code: 7017), approved, on top, front and side with grooves; 3/8\" thick lacquered deodar wood lipping on all edges; including divider, shelves; imported magnetic hinges, lock, stainless steel handles (Khas or equivalent) with polish finish as per approved sample and as directed by Engineer. Refer Drawing on Page No.54 of Facility Design Manual. Wall Cabniet",
            "unit": "Sft",
            "rate": 1630.0
          },
          {
            "title": "Providing and fixing in position low height type cabinets; cabinet frame made up of 20mm thick mdf board pressed on both sides with Formite A Grade Lamination (Code: 7601), cabinet shutter made up of 20mm thick mdf board pressed on both sides with Formite A Grade Lamination (Code: 7017), approved, on top, front and side with grooves; 3/8\" thick lacquered deodar wood lipping on all edges; including divider, shelves; imported magnetic hinges, lock, stainless steel handles with polish finish as per approved sample and as directed by Consultant. Refer Drawing on Page No. 54 of Facility Design Manual. Floor Cabniet",
            "unit": "Sft",
            "rate": 1605.0
          }
        ]
      },
      {
        "title": "19 LCD Frame",
        "subtasks": [
          {
            "title": "Providing & fixing of LCD frame of MDF lasani sheet (16mm) over partal wooden frame of required size complete in all respects including wooden polish of approved pattern as directed by Engineer incharge.",
            "unit": "Nos",
            "rate": 54000.0
          }
        ]
      },
      {
        "title": "20 Vantage & Emergency Door",
        "subtasks": [
          {
            "title": "Providing, making & fixing Steel vantage door & GI frame size 2' - 6\" x 7' - 0\" made of MS sheet 16SWG. Door fitted with including paint (Sky Grey) on external side including approved door lock,stopper,closer and mild steel hold fasts, screw etc, complete in all respects as per dwgs and directed by the Engineer",
            "unit": "Nos.",
            "rate": 24500.0
          },
          {
            "title": "Providing, making & fixing Emergency Exit door & frame, Fire Resistant upto 120 minutes asper standard NFPA-252 and UL 10C, frame: 1.5mm Door Leaf: 1mm infill honeycomb, hydraulic press, SS Hinges, Push Panic Bar, redoxide base, final in powder coated paint, complete in all respects as per dwgs and directed by the Engineer.",
            "unit": "No.",
            "rate": 59000.0
          },
          {
            "title": "Providing, making & fixing MS door for Rooftop & GI frame size 3' - 0\" x 7' - 0\" made of MS sheet 16SWG. Door fitted with including paint on external & Internal side including approved door lock and mild steel hold fasts, screw etc, complete in all respects as per dwgs and directed by the Engineer",
            "unit": "No.",
            "rate": 41730.0
          }
        ]
      },
      {
        "title": "21 Wooden hanging Beam/MDF Drop Panel",
        "subtasks": [
          {
            "title": "Providing & fixing in position wooden Beams for support to fix glass and glass door consisting of 1-1/2 x3\" @ 2'-0\" c/c partal wood framing and 3/4\" MDF Lasani board (Malaysia) on both sides including nails, bolts, glue wastage, wood preservative, treatment & 3 coats of paint complete in all respect as per drawings and as directed by Bank' s Engineers.( Including cost of Anti-Termite treatment)(Surface Measurement wil be considered)",
            "unit": "Sft",
            "rate": 790.0
          }
        ]
      },
      {
        "title": "22 Dry Partition.",
        "subtasks": [
          {
            "title": "Providing and fixing in position wooden partition costing of 1-1/2\"x3\" @ 2'-0\" c/c partal wood framing and 3/4\" MDF Lasani board (Malaysia) on both sides and 4-1/2\" wide and 1-1/2\" high solid Beech Wooden Sill with 03 coats of spirit polish of matching shade including nails, bolts, glue, three coats of ICI paint & wood preservative treatment, complete as per drawing and specifications. (Including cost of Anti-Termite treatment)",
            "unit": "Sft",
            "rate": null
          }
        ]
      },
      {
        "title": "23 FALSE CEILING",
        "subtasks": [
          {
            "title": "(1) Supply and installation of required Grid type False ceiling as per drawing. (2)The unit comprises required size Back foiled sheets of DFB,United or equiavalent and Elephant Brand gypsum board for border or equivalent with drop panel of 3\" thick around the false ceiling with Bank's approved paint (Brilliant white) including filling complete in all respects. (3)The suspension system shall be concealed type(GypGrid-32 Series) comprising of galvanized steel spring tee runners and wall angles sections. The main Tee should be suspended from overhead structure with gugae 14 glavanized steel wires/hangers together with hanger bracket/ adjustable clips and edge trims, the spacing for main TEE should not be more than 48\" c/c. (4)Cross TEE should be inserted into main TEE slot and locked into position properly. (5)The suspender shall be fixed to the slab/beam soffits with nylon anchors 1.5” x 12 No. round head steel screws and washers, all installed in accordance with Manufacturer's instructions and complete in all respects conforming to the requirement of the drawing and as directed by the Consultant/ Bank's Engineer.",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing & laying gypsum board ceiling , 24\"x24\" (with aluminum backfoil (DFB or equaivalent) channel CKM or equivalent with groove Diso-T. Fixed with proper aluminum, \" T\" & \"L\" section with appropriate suspension system, having provisions for light and AC panels, approved (where ever required) complete in all respect. paints.",
            "unit": "Sft",
            "rate": 181.9
          },
          {
            "title": "Providing and installation of gypsum board plain ceiling with grooves at joints of Elephant brand or equivalent using 12mm thick with suspension system including G.I. strips/wires, furring channels/angles, tape on joints with gypsum filling and rubbing having provisions for light and AC grill, approved paint on ceiling, complete in all respect as per drawing & instruction of Site Engineer. Refer ceiling drawing on Page No. 11 of Facility Design Manual. Including matt finish enamel paint (Brilliant white 4714) on ceiling as shown in ceiling plan details",
            "unit": "Sft",
            "rate": 275.0
          },
          {
            "title": "Providing and installing ceiling using specified MDF rafters (2\"x6\") at 12\" spacing below gypsum false ceiling including cost of requisite framing, polish/paint etc , complete in all respect as per details of Design Manual/drawings **Box area will be calculated for payment. Refer Rafter ceiling drawing on Page No. 12 of Facility Design Manual. (Rafter paint Royal Blue 8178/True Jade+Brilliant White 4714)(Box Paint Sky Grey Matt Enamel 3730)",
            "unit": "Sft",
            "rate": 203.3
          },
          {
            "title": "Oak Ply polish finish to be pasted on Gypsum (in Conference/SVP/VP Room) as shown in drawing complete in all respect.",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "2\" x 4\" Wooden Ribs/rafters box size @3\" spacing with matching paint/polish as shown in ceiling drawing or instruction of the Engineer Incharge.",
            "unit": "Nos",
            "rate": null
          }
        ]
      },
      {
        "title": "24 Security Shutters/Grills",
        "subtasks": [
          {
            "title": "Providing & installation of security fixed grill at internal face of windows 2\"X2\" hollow M.S frame with horizontal flat M.S plates 1-1/2\" x 1/4\" and vertical solid 1/2\" dia M.S rod. Refer Grill drawing on Page No.22 of Facility Design Manual.",
            "unit": "Sft",
            "rate": 834.6
          },
          {
            "title": "Providing, supplying & fixing in position security roller shutter with or without vision panel of ¼” MS bars having height 4” & width 30\" at 5ft to 6ft from ground level. Upper & lower portion of shutter made of Galvanized 20 SWG roll formed sheet. Shutter box either concealed in false ceiling or make a removable box cover. Complete job with 15 inch springs, bearing pully, side channels & plats, locking arrangement with handle complete in all respect Refer to Bank design manual P#21 for guidance.",
            "unit": "Sft",
            "rate": 909.5
          },
          {
            "title": "Repairing, refixing of roller shutter including all assesories and equipments (complete in all respect) as per Engineer's Instructions.",
            "unit": "Sft",
            "rate": null
          }
        ]
      },
      {
        "title": "25 Aluminium Glass Woks.",
        "subtasks": [
          {
            "title": "Tempered Glass Door",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and fixing 12 mm thick Tempered clear glass doors, with floor mounted imported door closer of GCC, and top pivot, including fixing 3” high 2mm thick aluminium H-section (Pakistan cables/lucky series) approved colour + GCC / New star Floor machine (GTS840)/New star Japanese at top and bottom, with gasket, best quality stainless steel door handles long straight (New star) polish of exposed edges SS D lock & bottom lock, complete in all respects and as directed by the Bank's Engineer.",
            "unit": "Sft",
            "rate": 2380.0
          },
          {
            "title": "Fix Glass Panel",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and fixing 12 mm thick imported glass on external windows & patitions fixing with 3” high 2mm thick aluminium H-section (Pakistan cables /Lucky) approved color aluminium U-channel along with the wall at top and bottom, true to plumb with cover on the hollow end of the aluminium H-section and polishing of exposed edges complete in all respects and as directed by the Engineer.",
            "unit": "Sft",
            "rate": 1610.0
          },
          {
            "title": "4\"X4\" square pipe (18 SWG) framing for external glass in elevation (including red oxide and paint finishing) wherever required, as per site and the instruction of engineer incharge.",
            "unit": "Rft",
            "rate": 385.2
          },
          {
            "title": "Fixed Glass Partition with Spiders",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and installation of fixed glass partitions for using using 12mm clear tempered glass fixed with Stainless Spiders of required size using 3\" dia Stainless Steel pipe for support from column to column. Complete in all respects including U Channel from top and bottom, silicon etc. complete in all respects (only glass will be measured for billing, wastage will not be claimed)",
            "unit": "Sft",
            "rate": null
          },
          {
            "title": "Fixed Ventilators",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing, fabrication & fixing window glass of Ghani/Tariq/UAE at window equivalent with 12mm thick Middle east or equivalent clear glass with gasket size and shape as shown on drawing including bolts, nuts, screws aluminum channel etc. complete in all respects. (1'-6\" x 1'-6\")",
            "unit": "Nos",
            "rate": 16200.0
          }
        ]
      },
      {
        "title": "26 Cash Counter",
        "subtasks": [
          {
            "title": "Refer Drawing on Page No. 23 to 29 of Facility Design Manual to execute as per Layout. i. Providing and laying at 4\" or 4½\" thick block/brick masonry, tellers divider partitions and front. (Detail same as item No.4) ii. Providing and laying at 1/2\" to 3/4\" thick ordinary Portland cement sand plaster.(Detail same as item No.5) iii. Providing and making of 2.5\" thick MDF with kail wood side partition wall align with front brick/block massonary wall of each cash counter as details shown in drawing. iv. Provide and fixing of MDF partition with Solid partal wooden framing from bottom to top of the counter from the customer side complete with fixing lasani sheet with top of customer area. v. Providing and fixing of 3\" thick working top with top & bottom MDF at top white glossy formica 7601 pasted & front lipped with Corian. As per Drawing vi.Providing and fixing of white glazed 1/2\" thick lamination on inside MDF wall of cash counter. vii.Providing & fixing of approved color & shade Corian of requisite color(PM-101 Ultra White & PM-882 Silver metallize) made as per detail given in drawing finishing/polishing etc. viii. 12mm thick Clear tempered Glass & 40\" high from fixed with SS 1\"X1\" hollow post with clamp clips and joint all glasses with industrial slicon with each other etc as per drawing. Note: Mobile drawers of requisite details to be provided with each counter. Corian will be as per insturctions. Clear Gap between counter glass and corian top not more than 2 \" from customer and side. Complete corian is required as per design manual.",
            "unit": "Nos",
            "rate": 224700.0
          },
          {
            "title": "Same as above but as per PWD standard Counter",
            "unit": "Nos",
            "rate": null
          }
        ]
      },
      {
        "title": "27 Cash Counter Back wall Framing",
        "subtasks": [
          {
            "title": "Providing making & fixing of MDF box having top rail of 10\" wide & Bottom/Side rails of 5\" wide wih 5\"/8\" Depth as per requirement of the project or Engineers Instructions. Refer Drawing on Page No. 29 to 31 of Facility Design Manual with backlit frame. Only Top Linear Measurement will be for payment.",
            "unit": "Rft",
            "rate": 1580.0
          }
        ]
      },
      {
        "title": "28 Stainless Steel Stair and Railing",
        "subtasks": [
          {
            "title": "Providing, fabricating & fixing in position at site M.S. Structure Stair from Ground to 1st Floor, as per drawing/design, making with M.S. Girder, steps made up of M.S. angles 1¼\" x 1¼\"x 3/16\" and chequered sheet, including the cost of red oxide, epoxy and 3 coat of enamel paint etc. complete with hoisting and erecting in position structure members of any design and height; complete as per drawings and specification supplied by the Project consultant. (For billing one floor will be counted as one Staircase)",
            "unit": "Nos",
            "rate": null
          },
          {
            "title": "Providing, fabricating and fixing in position 2’-9” high stair railing comprising of 2\" diameter 22 SWG (Non magnet Grade 304) stainless steel pipe at top, 1-1/4” SS balustrade fixed after every 4 steps or as shown in drawing of 20 SWG, and middle 1/2\" dia. stainless steel 22 SWG (Non magnet Grade 304) bars horizontally (3 No.), including cost of base plate, rawal bolts, rawal plugs, cutting if required complete in all respects and as directed by the Bank's Engineer. This includes S.S railing 2\" dia in PWD toilet for disable person as per approved layout. complete in all respect.",
            "unit": "Rft",
            "rate": 2620.0
          },
          {
            "title": "Providing, fabricating and fixing in position railing comprising of 2\" diameter 22 SWG (Non magnet Grade 304) stainless steel pipe including cost of base plate, rawal bolts, rawal plugs,cutting if required complete in all respects and as directed",
            "unit": "Rft",
            "rate": null
          }
        ]
      },
      {
        "title": "29 Ramp",
        "subtasks": [
          {
            "title": "MS Ramp Providing and making and fixing of MS checkered sheet with MS angle frame with ratio of 1:5 with repect to stairs steps 3' to 4'wide Refer Drawing on Page No.62 of Facility Design Manual & layout",
            "unit": "Rft",
            "rate": null
          }
        ]
      },
      {
        "title": "30 Kitchen/Toilet Counter Top",
        "subtasks": [
          {
            "title": "Provide & fix pre caste slab of 1:2:4 ratio for kitchen counter top",
            "unit": "Sft",
            "rate": 374.5
          },
          {
            "title": "Providing & fixing pre polished ¾\" thick Jet Black Top quality with approved size and shade over 2\" thick pre cast RCC slab including ½\" thick gola grouting and jointing including cost of cutting of marble for basin and sink bowl including filling with silicone around joint of marble complete in all respect as per satisfaction by the Bank engineer.",
            "unit": "Sft",
            "rate": 1320.0
          }
        ]
      },
      {
        "title": "31 Temite Proofing",
        "subtasks": [
          {
            "title": "Supply and Installation of termite proofing using Biflex /Fipronil or an approved equivalent (10 years warranty) on complete as per specifications, drawing and details provided & instruction issued by the Architect.(Drilling & spray method both)",
            "unit": "Sft",
            "rate": 25.68
          }
        ]
      },
      {
        "title": "32 Roof water proofing",
        "subtasks": [
          {
            "title": "Providing and laying insulation and water proofing to roof consisting of surface preparation, primer coat 0.5kg/sqm (50% bitumen & 50% kerosene oil) and 2 coat of flood coat of 10/20 bitumen @ 1.00 kg/sqm each, one layer of polythene sheet (25 swg) excluding PCC Screed works complete in all respect.(Screed cost is being considered by using PCC 1:2:4)",
            "unit": "Sft",
            "rate": 133.75
          },
          {
            "title": "Providing / Laying of 2' x 1' Marble flooring (B-Catogrey) half inch thick with 2\" thick 1:4 base plaster including grouting at roof top with proper slope complete in all respect including skirting as per satisfaction of bank's engineer.(all measurements in SFT)",
            "unit": "Sft",
            "rate": null
          }
        ]
      },
      {
        "title": "33 Roller Blinds",
        "subtasks": [
          {
            "title": "Providing and fixing Roller blinds of approved color/quality with aluminum channel with brackets works, complete in all respects as approved by the Consultant/ Bank's Engineer. (Waqas Blinds 03213884501 Grey-0481)",
            "unit": "Sft",
            "rate": 406.6
          }
        ]
      },
      {
        "title": "34 Mirror",
        "subtasks": [
          {
            "title": "Providing & Fixing Mirror glass 4' x 3' (Oval Design) with SS supported studs will all fittings complete in all respect.",
            "unit": "Sft",
            "rate": 856.0
          }
        ]
      },
      {
        "title": "35 Fixing of Strong and Locker Room Door",
        "subtasks": [
          {
            "title": "Fixing of Strong room door complete in all respect as per satisfaction of Bank's Engineer.",
            "unit": "Nos",
            "rate": 25145.0
          }
        ]
      },
      {
        "title": "36 MS Filing Racks With 5 Square Jali Shelves 81\"X36\"X16\"",
        "subtasks": [
          {
            "title": "Providing and fixing of Steel File Rack, using external frame and Squre Pipe 14 Gugae 1-1/4\"x 1-1/4\" size and Square Jali Mash 1'' use for Shelves , Jali Spat Welleded 8 Gauge Taar as per drawing, including base coat of red oxide and three coats of enamel ICI. Complete in all respect or as directed by the bank's Engineer.",
            "unit": "Nos",
            "rate": 72000.0
          }
        ]
      },
      {
        "title": "37 Cladding Works",
        "subtasks": [
          {
            "title": "12mm thick Cement Board Cladding including Channel Frame & 3 coats of ICI paint complete in all respect as directed by Bank's Engineers.",
            "unit": "Sft",
            "rate": 610.0
          },
          {
            "title": "MDF Board Cladding With Partal wooden Frame, 3 coats of ICI paint & polytene sheet complete in all respect including anti termite proofing as directed by Bank's Engineers.",
            "unit": "Sft",
            "rate": 745.0
          }
        ]
      },
      {
        "title": "38 Providing & installation of 18\" Dia & 16\" High Fibre Planters of approved design and Color along with internal area plants (Complete in all respect)",
        "subtasks": [
          {
            "title": "38 Providing & installation of 18\" Dia & 16\" High Fibre Planters of approved design and Color along with internal area plants (Complete in all respect)",
            "unit": "Nos",
            "rate": 9630.0
          }
        ]
      },
      {
        "title": "39 Providing pipe frame Stool with foam seat for Security Guard in Vantage room/Janitorial Staff of Suitable height as per Engineer instructions",
        "subtasks": [
          {
            "title": "39 Providing pipe frame Stool with foam seat for Security Guard in Vantage room/Janitorial Staff of Suitable height as per Engineer instructions",
            "unit": "Nos",
            "rate": 27820.0
          }
        ]
      },
      {
        "title": "40 Supply and Installtion ATM Base MS frames as site requirement of approved supplier (Ref Contact Number Mr. Bilal-03332089158)",
        "subtasks": [
          {
            "title": "40 Supply and Installtion ATM Base MS frames as site requirement of approved supplier (Ref Contact Number Mr. Bilal-03332089158)",
            "unit": "Nos",
            "rate": 35310.0
          }
        ]
      },
      {
        "title": "41 Dining Chairs",
        "subtasks": [
          {
            "title": "Providing and supply of Dining chairs of Master or equivalent as approved by Consultant (Basic price Rs 15,000 per Chair)",
            "unit": "Nos",
            "rate": null
          }
        ]
      },
      {
        "title": "42 Ablustion Seat",
        "subtasks": [
          {
            "title": "Providing and making of ablution seat 12\"x12\"x12\" including Granite at top with half round gola from all sides, complete in all respects",
            "unit": "Nos",
            "rate": null
          }
        ]
      },
      {
        "title": "43 FLOOR MATT",
        "subtasks": [
          {
            "title": "Providing and fixing of imported Floor Matt of approved Colour as per Bank Standard",
            "unit": "Sft",
            "rate": 340.0
          }
        ]
      },
      {
        "title": "44 SCAFFOLDING",
        "subtasks": [
          {
            "title": "Providing and installation of Scaffolding (Internal and External) for All Elevation works and internal plaster works at any height including green fabric from outside including all safety measures etc. complete in all respects",
            "unit": "Job",
            "rate": null
          }
        ]
      }
    ]
  },
  {
    "key": "plumbing",
    "label": "Plumbing Works",
    "aliases": [
      "plumb"
    ],
    "tasks": [
      {
        "title": "General",
        "subtasks": [
          {
            "title": "PLUMBING WORKS",
            "unit": null,
            "rate": null
          }
        ]
      },
      {
        "title": "1 Plumbing Fixtures",
        "subtasks": [
          {
            "title": "Providing and fixing Sanitary ware of Porta make with all Sanitary fittings of Master make including Muslim shower, Double Bib Cock, Towel Rail, Soap dish, Coat Hook & Toilet paper holder etc. complete in all respect or as directed by the Consultant / Bank's Engineer.",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and fixing CP sink mixer, C.P pipe 15mm dia. Complete including pipe connection, all fittings, testing etc. As per Facility Design Manual.",
            "unit": "No",
            "rate": 12840.0
          },
          {
            "title": "Providing and fixing stainless steel rectangular kitchen sink of required size for kitchen counter pasting with Jelly/silicon with 40mm dia heavy duty waste coupling and PVC flexible waste pipe of approved make and quality complete in all respects. As per attached picture or Engineer instructions.",
            "unit": "No",
            "rate": 21614.0
          },
          {
            "title": "Providing and fixing European type ceramics ware coupled water closet, white / light color including 3 gallons cistern, P/s Trap, PVC flexible pipe connection, C.P tee stop cock with wall cups, \"PORTA Brand\" bacolite seat cover of best quality complete in all respect. As shown on Page No.58 of Facility Design Manual.",
            "unit": "No",
            "rate": 62060.0
          },
          {
            "title": "Providing and fitting Glazed earthen ware water closet, squatting Pan (585x435x300)(Porta HD-70) type as mentioned in bank manual, combined with foot rest, Best Quality including ceramic Flushing tank Porta connected by concealed arrangement, tee stop cock for cistern water inlet and C.P connector with nuts and fitting, approved other ancillary material complete in all respect.",
            "unit": "No",
            "rate": 33170.0
          },
          {
            "title": "Providing and fixing wash hand basin fixed \"Porta Half pedestal basin\" \"MASTER\" waster couple in, plug with C.P brass chain, 1 1/2'' dia . P.V.C (D-type) waste pipe, connections to water lines, C.P grating including C.P bottle trap, testing etc. As per Facility Design Manual. one should be low height wash basin for disable persons (as per PWD standard)",
            "unit": "No",
            "rate": 23000.0
          },
          {
            "title": "Providing and fixing 15mm dia C.P bib cock/mixer of make \"Make\" \"Master\", C.P pipe 15mm dia. Complete including pipe connection, all fittings, testing etc. As shown on Page No.57 of Facility Design Manual.",
            "unit": "No",
            "rate": 7500.0
          },
          {
            "title": "PVC Muslim Shower with Powder coated C.P double bib cock with flexible pipe of \"MASTER\" complete in all respect. As per Facility Design Manual & Engineers instructions.",
            "unit": "No",
            "rate": 4300.0
          },
          {
            "title": "Provide and fixing soap dish \"MASTER\", as per Facility Design Manual complete in all respect.",
            "unit": "No",
            "rate": 3745.0
          },
          {
            "title": "Providing and fixing C.P toilet paper holder , \"MASTER\" as per Facility Design Manual complete in all respect.",
            "unit": "No",
            "rate": 3745.0
          },
          {
            "title": "providing and fixing towel rail C.P 24'' long and 3/4'' dia & Coat Hook Double, as per Facility Design Manual complete in all respect.",
            "unit": "No",
            "rate": 3745.0
          }
        ]
      },
      {
        "title": "2 Plumbing System",
        "subtasks": [
          {
            "title": "Providing and fixing complete plumbing system by best quality UPVC, PPR piping complete in all respect including connection from underground tank and main sewerage.(All material to be selected from approved manufacturers list or equivalent as approved by Bank's Engineer)",
            "unit": null,
            "rate": null
          },
          {
            "title": "2.1 Kitchen Complete Internal Water(Cold)& Sewer System Job as per approved specification",
            "unit": "Job",
            "rate": 62000.0
          },
          {
            "title": "2.2 Toilets Complete Internal Water(Cold) & Sewer System Job as per approved specification",
            "unit": "Job",
            "rate": 62000.0
          }
        ]
      },
      {
        "title": "3 Plumbing Fittings",
        "subtasks": [
          {
            "title": "3\" Dia UPVC pipe for drainage & Rain water complete in all respect. (Make: Dadex, AGM, Plasco or equivalent as approved by Bank's Engineer )",
            "unit": "Rft",
            "rate": 454.75
          },
          {
            "title": "4\" Dia UPVC pipe for drainage & Rain water complete in all respect. (Make: Dadex, AGM, Plasco or equivalent as approved by Bank's Engineer )",
            "unit": "Rft",
            "rate": 561.75
          },
          {
            "title": "6\" Dia UPVC pipe for drainage & Rain water complete in all respect. (Make: Dadex, AGM, or equivalent as approved by Bank's Engineer)",
            "unit": "Rft",
            "rate": 642.0
          },
          {
            "title": "6\" Dia UPVC pipe for Ventilation. (Make: Dadex, AGM, or equivalent as approved by Bank's Engineer)",
            "unit": "Rft",
            "rate": 556.4
          },
          {
            "title": "32mm PPRC pipe for water supply (Cold) complete in all respect. (Make: Dadex, AGM, or equivalent as approved by Bank's Engineer)",
            "unit": "Rft",
            "rate": null
          },
          {
            "title": "25mm PPRC pipe for water supply (Cold) complete in all respect. (Make: Dadex, AGM, or equivalent as approved by Bank's Engineer)",
            "unit": "Rft",
            "rate": 428.0
          },
          {
            "title": "20mm PPRC pipe for water supply (Cold) complete in all respect. (Make: Dadex, AGM, or equivalent as approved by Bank's Engineer)",
            "unit": "Rft",
            "rate": 385.2
          },
          {
            "title": "Providing and fixing of full way gate valves of bronze trim up to 3\" (75mm) dia. With threaded ends and cast iron body bronze trim flanged ends for 4\" dia. (100mm) and above Econosto make (Japan) or equivalent or similar for 125 psi together with all additional material required for a complete installation as described in the specification and as shown on drawings and as approved by the Eng.",
            "unit": null,
            "rate": null
          },
          {
            "title": "12mm dia.",
            "unit": "No",
            "rate": null
          },
          {
            "title": "20mm dia.",
            "unit": "Nos",
            "rate": 7490.0
          },
          {
            "title": "32mm dia.",
            "unit": "Nos",
            "rate": 9630.0
          },
          {
            "title": "Floor Drain",
            "unit": null,
            "rate": null
          },
          {
            "title": "Providing and fixing 100mm dia uPVC floor drain/gully manufactured by UPVC Dadex/ AGM (U.A.E). including , cement concrete (1:2:4) chambers all around with heavy duty Stainless Steel / UPVC grating, hinged on one end of \" SONEX\", \" MASTER\" complete in all respects.",
            "unit": null,
            "rate": null
          },
          {
            "title": "75mm dia.",
            "unit": "Nos.",
            "rate": 8132.0
          },
          {
            "title": "O.H Tank",
            "unit": null,
            "rate": null
          },
          {
            "title": "g1 Providing and fixing of Master Overhead water tank of 500 gallon (if required )",
            "unit": "No",
            "rate": null
          },
          {
            "title": "g2 Providing and fixing of Master Overhead water tank of 300 gallon I(f required)",
            "unit": "No",
            "rate": 64200.0
          },
          {
            "title": "Ablution Bib Cock",
            "unit": null,
            "rate": null
          },
          {
            "title": "h1 Providing and installation of long head bib cock for Ablution",
            "unit": "No",
            "rate": null
          },
          {
            "title": "Water Pump",
            "unit": null,
            "rate": null
          },
          {
            "title": "i1 Supply and Installation of 2HP Golden Water Pump with electric point and connection with necessary accessories etc., complete with all respect as per the direction of the Architect.",
            "unit": "No",
            "rate": 74900.0
          },
          {
            "title": "i2 Supply and Installation of 1HP Submersible Pump with electric point and connection with necessary accessories etc., complete with all respect as per the direction of the Architect.",
            "unit": "No",
            "rate": null
          },
          {
            "title": "Man Hole",
            "unit": null,
            "rate": null
          },
          {
            "title": "j1 Providing and construction of 2'x2' Man Hole including excavation, Plaster, Water Proofing and heavy duty RCC Man Hole Cover",
            "unit": "No",
            "rate": 14980.0
          }
        ]
      }
    ]
  },
  {
    "key": "electrical",
    "label": "Electrical Works",
    "aliases": [
      "electric"
    ],
    "tasks": [
      {
        "title": "GENERAL WIRING & ACCESSORIES",
        "subtasks": [
          {
            "title": "1.0 Providing and installing light and fan point wiring with 3 x 1.5sq.mm single core PVC insulated 450/750V grade copper wires Pakistan Cables make in 3/4\" dia. PVC conduit Galco/Jeddah make surface/concealed mounted including all accessories, connectors complete in all respect.",
            "unit": null,
            "rate": null
          },
          {
            "title": "1.1 Light point controlled by one switch.",
            "unit": "Nos.",
            "rate": 3500.0
          },
          {
            "title": "1.2 Light point from point to point.",
            "unit": "Nos.",
            "rate": 2300.0
          },
          {
            "title": "1.3 Exhaust fan point",
            "unit": "Nos.",
            "rate": 3500.0
          },
          {
            "title": "1.4 Revolving fan point",
            "unit": "Nos.",
            "rate": 3500.0
          },
          {
            "title": "2.0 Circuit wiring from distribution board to switch/lighting point with 3 x 2.5sq.mm in 1\" dia. PVC conduit including adjacent switch boards , complete with all accessories .",
            "unit": "Nos.",
            "rate": 6500.0
          },
          {
            "title": "2.1 Same as Item No.2.0 but wiring from point to point (switch board to switch board).",
            "unit": "Nos.",
            "rate": 3400.0
          },
          {
            "title": "3.0 Providing and installing of circuit wiring from DB-LC for 13A, multi pin switch socket outlet with 3 x 2.5 sq.mm single core PVC insulated copper wires in 1\" dia. PVC conduit concealed/surface mounted with all accessories, sheet steel back boxes with brass earth terminals including first outlet . (Raw Power/LC)",
            "unit": "Nos.",
            "rate": 7800.0
          },
          {
            "title": "3.1 Same as Item No. 3.0 but wiring from point to point including adjacent outlet",
            "unit": "Nos.",
            "rate": 3400.0
          },
          {
            "title": "4.0 Providing and installing of circuit wiring from MDB/Floor DB to 13/15amp 3 pin switch socket outlets wired with 2x 4sq.mm + 1 x 2.5sq.mm single core PVC insulated copper wires in 1\" dia PVC conduit, surface/ concealed mounted with all accessories, sheet steel back boxes with brass earth terminal. and providing and installing 3 pin, 13A specified switch socket outlet. (Power plug)",
            "unit": "Nos.",
            "rate": 7500.0
          },
          {
            "title": "4.1 Same as Item No. 4.0 but wiring from point to point",
            "unit": "Nos.",
            "rate": 3550.0
          },
          {
            "title": "5.0 Providing and installing of circuit wiring from UPS DB to 13A 3 pin switch socket ( duplex) outlets wired with 3 x 4 sq. mm single core PVC insulated copper wires in 1\" dia PVC conduit, surface/ concealed mounted with all accessories, sheet steel back boxes with brass earth terminal. ( For Ups Power)",
            "unit": "Nos.",
            "rate": 8600.0
          },
          {
            "title": "5.1 Same as Item No.5.0 but wiring from point to point (i.e duplex outlet to another duplex outlet)",
            "unit": "Nos.",
            "rate": 3500.0
          },
          {
            "title": "6.0 Providing & installing wiring for split units from distribution board to respective unit/load break switch with 2x 6sq.mm + 1 x 4sq.mm single core PVC insulated copper wires in 1\" dia. PVC conduit, complete in all respects.",
            "unit": "Nos.",
            "rate": 9500.0
          },
          {
            "title": "Providing & installing wiring for split units from distribution board to respective unit/load break switch with 4x 4sq.mm + 1 x 4sq.mm single core PVC insulated copper wires in 1\" dia. PVC conduit, complete in all respects.",
            "unit": "Nos.",
            "rate": null
          },
          {
            "title": "7.0 Circuit wiring from distribution board to sign lights wired with 2x 4sq.mm + 1 x 2.5sq.mm single core PVC wired with 1\" dia PVC conduit. Complete with all accessories.",
            "unit": "No.",
            "rate": 8300.0
          },
          {
            "title": "8.0 Supply & installation of under floor/wall box of 16 SWG.G.I. Sheet having cover of 12 SWG. Suitable for 1 No. 5 Amps 3 pin Socket, 2 Nos. 13 Amps. Socket, 1 No. Telephone outlet and 1No. data outlet.",
            "unit": "Nos.",
            "rate": null
          },
          {
            "title": "9.0 Supply & installation of Technology box of 16 SWG.G.I. Sheet having cover of 12 SWG. Suitable for 1 No. 5 Amps 3 pin Socket, 2 Nos. 13 Amps. Socket, 1 No. Telephone outlet and 1No. data outlet.",
            "unit": "Nos.",
            "rate": 5100.0
          },
          {
            "title": "10.0 Providing & installing of Metal pull box size 12\"x12\" and 4\" deep with cover",
            "unit": "No.",
            "rate": 3800.0
          },
          {
            "title": "11.0 Providing, fixing & connecting of Schneider (Vivace series) make Gang switches , fixed on suitable size 1.5mm thick sheet steel back boxes recessed in wall or surface on wall, as required, complete in all respect. As per Facility Design Manual 2017 )",
            "unit": null,
            "rate": null
          },
          {
            "title": "11.1 One Gang Switch",
            "unit": "Nos.",
            "rate": 1150.0
          },
          {
            "title": "11.2 Two Gang Switch",
            "unit": "Nos.",
            "rate": 1230.0
          },
          {
            "title": "11.3 Three Gang Switch",
            "unit": "Nos.",
            "rate": 1490.0
          },
          {
            "title": "11.4 Four Gang Switch",
            "unit": "Nos.",
            "rate": 1600.0
          },
          {
            "title": "11.5 Six Gang Switch",
            "unit": "Nos.",
            "rate": null
          },
          {
            "title": "11.6 2PIN Shaver Socket",
            "unit": "Nos.",
            "rate": null
          },
          {
            "title": "11.7 13 Amps multi pin switched socket outlet plate",
            "unit": "Nos.",
            "rate": 1400.0
          },
          {
            "title": "11.8 15 Amps single switched socket outlet plate.",
            "unit": "Nos.",
            "rate": 1600.0
          },
          {
            "title": "11.9 13 Amps, 3 pin dual switched socket outlet plate",
            "unit": "Nos.",
            "rate": 2400.0
          },
          {
            "title": "11.10 40/32 Amp Industrial Socket (Schneider)",
            "unit": "Set",
            "rate": 15000.0
          },
          {
            "title": "11.11 63 Amp Industrial Socket (Schneider)",
            "unit": "Set",
            "rate": 16000.0
          }
        ]
      },
      {
        "title": "LIGHT FIXTURES & FANS",
        "subtasks": [
          {
            "title": "12.0 Only Installation of following owner supplied light fixtures including connecting accessories, flexible pipe, wire, termination, connectors testing & commissioning.",
            "unit": null,
            "rate": null
          },
          {
            "title": "LED Down Light recessed ceiling mounted with 18 watts (Installation Only).",
            "unit": "Nos.",
            "rate": 550.0
          },
          {
            "title": "LED Down Light recessed ceiling mounted with 12 watts (Installation Only).",
            "unit": "Nos.",
            "rate": 550.0
          },
          {
            "title": "Surface mounted LED Light recessed ceiling mounted with 12 watts (Installation Only).",
            "unit": "Nos.",
            "rate": 550.0
          },
          {
            "title": "2' X 2' or 1' X 4' LED T5 Batten Light 3000/4000K",
            "unit": "Nos.",
            "rate": 1500.0
          },
          {
            "title": "12.1 Supply and Installation of following light fixtures including connecting accessories, flexible pipe, wire, termination, connectors testing & commissioning",
            "unit": null,
            "rate": null
          },
          {
            "title": "LED Liner Light (FT)",
            "unit": "Rft",
            "rate": null
          },
          {
            "title": "LED Smart Laser Blade light 10W (800 lumens)",
            "unit": "Nos.",
            "rate": null
          },
          {
            "title": "12.2 Supply, installation and commissioning of Exhaust / Ceiling / Revolving Fans of following sizes, plastic body, louvers, all necessary fixing accessories. As per drawing",
            "unit": null,
            "rate": null
          },
          {
            "title": "12.3 Exaust Fan with grill & 4 \" pvc pipe complete in all respect and manner FOR T1,T2 & kitchen volden / volex make",
            "unit": "Nos.",
            "rate": 9000.0
          },
          {
            "title": "12.4 Wall mounted fan 24\" dia (Pak Fan)",
            "unit": "Nos.",
            "rate": 15200.0
          },
          {
            "title": "12.5 2' x 2' diameter ceiling mounted Revolving fan (Pak Fan)",
            "unit": "Nos.",
            "rate": 15200.0
          },
          {
            "title": "12.6 LED Strip in Different lengths with Drivers as per Drawings (Make FT)",
            "unit": "Mtr.",
            "rate": null
          }
        ]
      },
      {
        "title": "DISTRIBUTION BOARDS",
        "subtasks": [
          {
            "title": "13.0 Supply, installation, connecting, testing & commissioning of the following indoor Distribution Boards Unique Engineering, Power Professionals, Premier Engineering approved by client/consultant. Vendor should be submit manufacture shop dwg for approval to the client.",
            "unit": null,
            "rate": null
          },
          {
            "title": "13.1 MDB + Floor DB ( as per site & client requirement) of approved vendor",
            "unit": "Nos.",
            "rate": 150000.0
          },
          {
            "title": "13.2 DB - UPS & LC ( as per site/Client requirement) of aproved vendor",
            "unit": "Nos.",
            "rate": 290000.0
          },
          {
            "title": "13.3 63/80 TP MCCB Breaker with accessories including metal enclosure (if required)",
            "unit": "Nos.",
            "rate": 72000.0
          },
          {
            "title": "13.4 100 Amp TP MCCB With Box and Indication Lamp/Control Fuses.",
            "unit": "Nos.",
            "rate": 40000.0
          },
          {
            "title": "13.5 Existing installed main cables (Meter to DB, Genset to ATS etc) tagging, dressing, testing, megerring & commissioning of various sizes.",
            "unit": "Nos.",
            "rate": null
          },
          {
            "title": "13.6 Existing installed DB & Panels tagging, dressing, testing, load balancing & commissioning of distribution boards, specifications, load schedule, complete in all respects",
            "unit": "Nos.",
            "rate": null
          }
        ]
      },
      {
        "title": "FEEDERS & SUB-FEEDERS",
        "subtasks": [
          {
            "title": "MAIN/SUB-MAIN CABLES",
            "unit": null,
            "rate": null
          },
          {
            "title": "14.0 Supply, installation and connection of following main, submain 600 / 1000V grade cu pvc/pvc cables.(Pakistan Cables) in suitable size of PVC Conduit. Galco/Jeddah make.",
            "unit": null,
            "rate": null
          },
          {
            "title": "From Meter to ATS Panel",
            "unit": null,
            "rate": null
          },
          {
            "title": "35 mm² 4 core PVC/PVC cable + 1-C 16 sqmm S/c Cu.Pvc cable as ECC laid in suitable size of pvc conduit.",
            "unit": "Mtr.",
            "rate": 9500.0
          },
          {
            "title": "From Generator to ATS Panel",
            "unit": null,
            "rate": null
          },
          {
            "title": "25 mm² 4 core pvc/ pvc cable + 1 x 16 mm² s/c pvc Cu. Pvc cable in suitable size of pvc conduit .",
            "unit": "Mtr.",
            "rate": 6500.0
          },
          {
            "title": "b-1) Same as item no (b) but cable size 2.5 mm² 4 core pvc/pvc Cable in suaitable size of pvc conduit.",
            "unit": "Mtr.",
            "rate": 5500.0
          },
          {
            "title": "From ATS Panel to Main DB",
            "unit": null,
            "rate": null
          },
          {
            "title": "25 mm² 4 core cu pvc/ pvc cable + 1 x 16 mm² s/c pvc cable in suitable size of pvc conduit .",
            "unit": "Mtr.",
            "rate": 6600.0
          },
          {
            "title": "From Main DB to UPS/LC DB",
            "unit": null,
            "rate": null
          },
          {
            "title": "10mm² 4 core + 1x 10mm cu pvc/ pvc cable in suitable size of pvc conduit .",
            "unit": "Mtr.",
            "rate": 3200.0
          },
          {
            "title": "d-1) Same as item no (d) but cable size 16 mm² 4 core + 1 x 10 mm",
            "unit": "Mtr.",
            "rate": 4000.0
          }
        ]
      },
      {
        "title": "EARTHING",
        "subtasks": [
          {
            "title": "15.0 Supply. Installation & Testing of EFE-T Chemical Grounding System with 25 mm dia having Heavy-duty Copper Rod 10 Ft. long filled with Soil Conditioning Material with 6\" x 25 Ft / water level 1 x 70 sq.mm single core . Deep Boring with heavy duty PVC Put within Coaster Silver Cover for air breathing with Brass Nuts and Bolts ready to use. upto Test Terminal.for Earthing the result should be less than 1 Ohm, Complete in all respect.",
            "unit": "Nos.",
            "rate": 42000.0
          },
          {
            "title": "15.1 Supply, installation & connection of 1 x 16sq.mm single core Cu.pvc cable (Pakistan cables) in PVC pipe Galco/Jeddah Make from EP to Panels as per Drawings",
            "unit": "Mtr.",
            "rate": 920.0
          },
          {
            "title": "15.2 Supply, installation & connection of 1 x 16sq.mm single core Cu.pvc cable (Pakistan cables) in PVC pipe Galco/Jeddah Make from EP to Panels as per Drawings",
            "unit": "Mtr.",
            "rate": 920.0
          },
          {
            "title": "15.3 Supply, installation & connection of 1 x 10sq.mm single core Cu.pvc cable (Pakistan cables) in PVC pipe Galco/Jeddah Make from EP to Panels as per Drawings",
            "unit": "Mtr.",
            "rate": null
          },
          {
            "title": "15.4 Supply, installation & connection of 1 x 10sq.mm single core Cu.pvc cable (Pakistan cables) in PVC pipe Galco/Jeddah Make from EP to Panels as per Drawings",
            "unit": "Mtr.",
            "rate": null
          }
        ]
      },
      {
        "title": "MISC WORKS",
        "subtasks": [
          {
            "title": "16.1 Shop Drawings of DB's, Testing & Commissioning Reports, As-Built Drawings 03 Sets of Hard Copies & Electronic Editable Copies in USB for Entire Project which included Electrical/ELV/AC/IT&T/Security (Final Bill NOT Entertained without the Asbuilt Drawings, Documents & Testing Reports)",
            "unit": "Job.",
            "rate": 35000.0
          }
        ]
      }
    ]
  },
  {
    "key": "hvac",
    "label": "Air Conditioning Works",
    "aliases": [
      "aircondition",
      "hvac",
      "aircon"
    ],
    "tasks": [
      {
        "title": "1.0 Installation, Testing & commissioning with gas charging of Owner supplied Air conditioning unit complete in all respect ready to operate and vibration isolator flexible connection piping work complete in all respect.",
        "subtasks": [
          {
            "title": "i) Wall mounted (2.0 ton) Invertype",
            "unit": "No",
            "rate": 14000.0
          },
          {
            "title": "ii) Wall mounted (1.5 ton) Invertype",
            "unit": "No",
            "rate": 14000.0
          },
          {
            "title": "iii) Wall mounted (1.0 ton) Invertype",
            "unit": "No",
            "rate": 14000.0
          },
          {
            "title": "iv) Casset Ac (2.0/3.0/4.0 ton) invertype",
            "unit": "No",
            "rate": null
          },
          {
            "title": "v) Floor standing Ac (2.0/3.0/4.0 ton) invertype",
            "unit": "No",
            "rate": null
          }
        ]
      },
      {
        "title": "2.0 Servicing/Gas charging etc. of all existing AC Units complete in all respects",
        "subtasks": [
          {
            "title": "i) Wall mounted (2.0 ton) Invertype",
            "unit": "No",
            "rate": null
          },
          {
            "title": "ii) Wall mounted (1.5 ton) Invertype",
            "unit": "No",
            "rate": null
          },
          {
            "title": "iii) Wall mounted (1.0 ton) Invertype",
            "unit": "No",
            "rate": null
          },
          {
            "title": "iv) Casset Ac (2.0/3.0/4.0 ton) invertype",
            "unit": "No",
            "rate": null
          },
          {
            "title": "v) Floor standing Ac (2.0/3.0/4.0 ton) invertype",
            "unit": "No",
            "rate": null
          }
        ]
      },
      {
        "title": "2.0 Supply and installation of wall mounted angle iron frame 1/8''x1.5' duly galvanized for placing out door unit. details to be approved by Engineer prior installation.",
        "subtasks": [
          {
            "title": "2.0 Supply and installation of wall mounted angle iron frame 1/8''x1.5' duly galvanized for placing out door unit. details to be approved by Engineer prior installation.",
            "unit": "Set",
            "rate": 6800.0
          }
        ]
      },
      {
        "title": "3.0 Supply and installation and commissioning of Refrigerant piping (liquid + Gas 5/8 + 3/8 ) make Muller USA with seprate insulation between coper tubes & expended rubber foam insulation (Make Aero flex) protected with Gray Tape , Gas Charging if required. Control wiring with 4x2.5mm2 PVC insulated copper cable (pakistan Cables) in P.V.C conduit Galco/jaddah including accessories between internal and external units including civil work, complete in all respect.",
        "subtasks": [
          {
            "title": "3.0 Supply and installation and commissioning of Refrigerant piping (liquid + Gas 5/8 + 3/8 ) make Muller USA with seprate insulation between coper tubes & expended rubber foam insulation (Make Aero flex) protected with Gray Tape , Gas Charging if required. Control wiring with 4x2.5mm2 PVC insulated copper cable (pakistan Cables) in P.V.C conduit Galco/jaddah including accessories between internal and external units including civil work, complete in all respect.",
            "unit": "R Meter",
            "rate": 4200.0
          },
          {
            "title": "3.1 Sam as 3.0 item no but copper pipe size 1/4 + 1/2",
            "unit": "R Meter",
            "rate": 3800.0
          }
        ]
      },
      {
        "title": "4.0 Supply & installation of UPVC Schedule 40 AGM Pipe including cutting and repair with insulation of drain etc. and making good without painting.",
        "subtasks": [
          {
            "title": "4.1 3/4'' Dia",
            "unit": "R Meter",
            "rate": 690.0
          },
          {
            "title": "4.2 2'' dia",
            "unit": "R Meter",
            "rate": null
          },
          {
            "title": "4.3 1\" dia",
            "unit": "R Meter",
            "rate": 850.0
          }
        ]
      },
      {
        "title": "5.0 Supply and Installation of 3'-6\" wide Platform for AC Units made of MS Chequered plate base with Angle iron frame including MS Railing for safety complete in all respects including red oxide paint",
        "subtasks": [
          {
            "title": "5.0 Supply and Installation of 3'-6\" wide Platform for AC Units made of MS Chequered plate base with Angle iron frame including MS Railing for safety complete in all respects including red oxide paint",
            "unit": "Rft",
            "rate": null
          }
        ]
      },
      {
        "title": "6.0 Providing and construction of 2'x2'x2' Pit for AC Drain Water (Possibly under the stairs) made of Black masonry with plaster from inside and outside with water proofing compound including Fiberglass Manhole cover, complete in all respects as per instructions",
        "subtasks": [
          {
            "title": "6.0 Providing and construction of 2'x2'x2' Pit for AC Drain Water (Possibly under the stairs) made of Black masonry with plaster from inside and outside with water proofing compound including Fiberglass Manhole cover, complete in all respects as per instructions",
            "unit": "Job",
            "rate": null
          }
        ]
      }
    ]
  },
  {
    "key": "itt",
    "label": "IT & T Works",
    "aliases": [
      "itt",
      "itandt",
      "telephone",
      "network"
    ],
    "tasks": [
      {
        "title": "TELEPHONE & COMPUTER NETWORK",
        "subtasks": [
          {
            "title": "1.0 Wiring for computer data outlets using Cat 6 cable (3M corning make between data outlets and Computer Hub in 25mm dia. or bigger size PVC conduit (Galco/Jaddah make including terminations at the Data outlets. include fluke testing and report.",
            "unit": "No.",
            "rate": 8900.0
          },
          {
            "title": "2.0 Wiring for telephone outlets from PABX using Cat 6 cable 3M Corning make laid in 25mm dia. or bigger size PVC conduit Galco/Jaddah make recessed in wall/floor including all accessories, and with terminations at both ends.",
            "unit": "No.",
            "rate": 8900.0
          },
          {
            "title": "3.0 Supply, laying of 1x10-pair telephone cable of siemens Make from PTCL to MDF laid in 32mm dia PVC conduit Galco/Jaddah make recessed in wall/floor, complete with terminations at both ends.",
            "unit": "Meter",
            "rate": 600.0
          },
          {
            "title": "4.0 Supply and Installation of 24 port patch panel 3m Corning including testing cable manager and commissioning complete in all respects. (loaded with 3M Corning cat 6 io.)",
            "unit": "Job",
            "rate": 28000.0
          },
          {
            "title": "5.0 Supply and Installation of 27U Rack of approved brand (Optional) with all accessories including 2xUniversal PDU",
            "unit": "No.",
            "rate": 56000.0
          },
          {
            "title": "6.0 Installation, Tagging & Assemblling of Cables",
            "unit": "Job",
            "rate": 18000.0
          }
        ]
      },
      {
        "title": "DATA REQUIREMENTS",
        "subtasks": [
          {
            "title": "7.0 Communication room",
            "unit": null,
            "rate": null
          },
          {
            "title": "7.1 RJ 45 Connectors",
            "unit": "No",
            "rate": 250.0
          },
          {
            "title": "7.2 UTP Cat-6 Cable",
            "unit": "Meter",
            "rate": 250.0
          },
          {
            "title": "7.3 Faceplate (back box, dual I/O)",
            "unit": "No",
            "rate": 1700.0
          },
          {
            "title": "7.4 Faceplate (back box, single I/O)",
            "unit": "No",
            "rate": 900.0
          },
          {
            "title": "7.5 I/O Cat-6 (3M Corning)",
            "unit": "No",
            "rate": 900.0
          },
          {
            "title": "7.6 Patch & Drop cord (3M Corning)",
            "unit": null,
            "rate": null
          },
          {
            "title": "7.7 2 meter",
            "unit": "No",
            "rate": 1700.0
          },
          {
            "title": "7.8 1 meter",
            "unit": "No",
            "rate": 1500.0
          }
        ]
      },
      {
        "title": "VOICE REQUIREMENTS",
        "subtasks": [
          {
            "title": "8.0 Voice Requirements",
            "unit": null,
            "rate": null
          },
          {
            "title": "8.1 Faceplate (back box, single I/O) (3M corning)",
            "unit": "No",
            "rate": 900.0
          },
          {
            "title": "8.2 UTP Cat-6 for field (3M Corning)",
            "unit": "Mter",
            "rate": 710.0
          },
          {
            "title": "8.3 I/O Cat-6 (3M Corning)",
            "unit": "No",
            "rate": 1250.0
          },
          {
            "title": "8.4 Line Cords (3M Corning)",
            "unit": "No",
            "rate": 520.0
          },
          {
            "title": "8.5 IDF box (Corn block) PTCL ( optional)",
            "unit": "No",
            "rate": 8000.0
          },
          {
            "title": "8.6 RJ-11 Connectors",
            "unit": "No",
            "rate": 250.0
          },
          {
            "title": "8.7 DB box steel frame. ( Optional)",
            "unit": "No",
            "rate": 9200.0
          }
        ]
      }
    ]
  },
  {
    "key": "security",
    "label": "Security Works",
    "aliases": [
      "secur"
    ],
    "tasks": [
      {
        "title": "Burgler Alarm",
        "subtasks": [
          {
            "title": "1.0 Providing and installing of 5 Pair Telephone Cable (Pakistan Cables make in 1\" dia. PVC conduit Galco/Jaddah make including sheet steel back box with brass earth terminal.",
            "unit": "Mtr.",
            "rate": 510.0
          },
          {
            "title": "2.0 Providing and installing of 2x1.5 single core Cable in 3/4\" dia. PVC conduit including sheet steel back box with brass earth terminal.looping from existing isntallaed smoke Detactor.",
            "unit": "Meters",
            "rate": 380.0
          }
        ]
      },
      {
        "title": "CCTV SYSTEM",
        "subtasks": [
          {
            "title": "3.0 Wiring of CCTV Cameras using co-axial video cable of approved make and 3x2.5mmsq single core cable to be drawn in 25mm dia. or bigger size PVC conduit as per drawings. Refer Drawing on Page No. of Facility Design Manual 2017",
            "unit": "NO",
            "rate": null
          },
          {
            "title": "4.0 Wiring for CCTV using Cat 6 cable (3M Corning) in 25mm dia size PVC conduit including accessories from camera to CCTV rack locate at It room complte in all respect.",
            "unit": "NO",
            "rate": 5500.0
          }
        ]
      },
      {
        "title": "PANIC ALARM AND SECURITY SYSTEM",
        "subtasks": [
          {
            "title": "5.0 Providing & installing of 5 Pair special telephone cable (Pakistan Cables) in 1\" dia (under floor & above ceiling). PVC conduit Galco/Jaddah, surface / concealed mounted from panic Switches to Phoenix Armour control panel as per site requirement/approved drawing (Equipment ans accessories provided by Phoenix Armour)",
            "unit": "Mtr.",
            "rate": 510.0
          }
        ]
      },
      {
        "title": "QUEMATIC SYSTEM",
        "subtasks": [
          {
            "title": "6.0 Wiring for Quematic System using Cat 6 cable (3M Corning) in 3/4\" dia size PVC conduit Galco/Jaddah make including accessories from Quematic panel to respective/equipement display panels to locate at near to teller counters complte in all respect.",
            "unit": "Mtr.",
            "rate": 270.0
          }
        ]
      }
    ]
  }
];

export function normalizeDomainName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Match a user-typed domain name (e.g. "Civil Works", "IT & T") to a template domain.
export function findBoqTemplate(domainName: string): TemplateDomain | undefined {
  const n = normalizeDomainName(domainName);
  if (!n) return undefined;
  return BOQ_TEMPLATE.find((d) => d.aliases.some((a) => n.includes(a)));
}
