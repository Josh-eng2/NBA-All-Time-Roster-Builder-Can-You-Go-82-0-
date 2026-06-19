'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PLAYER DATABASE                                                             ║
// ║                                                                             ║
// ║  Format: DB['TeamName_Decade'] = [                                          ║
// ║    { id, name, pos, ppg, rpg, apg, spg, bpg, archetype },  ...             ║
// ║  ]                                                                          ║
// ║  Archetypes: Playmaker | Sharpshooter | Lockdown Defender |                 ║
// ║              Slasher   | Paint Beast  | Two-Way Star                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const DB = {
  // ── LAKERS ──────────────────────────────────────────────────────────────────
  Lakers_1960s: [
    { id:'west_68',    name:'Jerry West',           pos:'SG', ppg:26.9, rpg:5.1,  apg:6.3, spg:1.2, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'baylor_68',  name:'Elgin Baylor',         pos:'SF', ppg:27.1, rpg:13.5, apg:4.7, spg:0.8, bpg:0.5, archetype:'Slasher'           },
    { id:'chamberlain_68', name:'Wilt Chamberlain', pos:'C',  ppg:24.3, rpg:23.8, apg:4.4, spg:0.7, bpg:2.5, archetype:'Paint Beast'       },
  ],
  Lakers_1970s: [
    { id:'kareem_76',  name:'Kareem Abdul-Jabbar',  pos:'C',  ppg:27.7, rpg:14.5, apg:3.8, spg:1.4, bpg:3.2, archetype:'Paint Beast'       },
    { id:'goodrich_74',name:'Gail Goodrich',        pos:'SG', ppg:23.9, rpg:3.8,  apg:5.0, spg:1.1, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'wilkes_79',  name:'Jamaal Wilkes',        pos:'SF', ppg:18.6, rpg:6.8,  apg:2.4, spg:1.0, bpg:0.3, archetype:'Slasher'           },
    { id:'west_71',    name:'Jerry West',           pos:'PG', ppg:25.8, rpg:5.0,  apg:7.5, spg:1.5, bpg:0.3, archetype:'Playmaker'         },
  ],
  Lakers_1980s: [
    { id:'magic_87',   name:'Magic Johnson',        pos:'PG', ppg:22.0, rpg:6.3,  apg:11.2,spg:1.9, bpg:0.4, archetype:'Playmaker'         },
    { id:'kareem_87',  name:'Kareem Abdul-Jabbar',  pos:'C',  ppg:23.4, rpg:9.5,  apg:2.9, spg:0.9, bpg:2.5, archetype:'Paint Beast'       },
    { id:'worthy_88',  name:'James Worthy',         pos:'SF', ppg:21.1, rpg:5.7,  apg:3.0, spg:1.3, bpg:0.8, archetype:'Slasher'           },
    { id:'scott_88',   name:'Byron Scott',          pos:'SG', ppg:17.6, rpg:3.4,  apg:3.4, spg:1.3, bpg:0.2, archetype:'Sharpshooter'      },
  ],
  Lakers_1990s: [
    { id:'shaq_99',    name:"Shaquille O'Neal",     pos:'C',  ppg:26.3, rpg:12.5, apg:2.5, spg:0.6, bpg:2.4, archetype:'Paint Beast'       },
    { id:'kobe_99',    name:'Kobe Bryant',          pos:'SG', ppg:19.9, rpg:5.5,  apg:4.9, spg:1.4, bpg:0.5, archetype:'Slasher'           },
    { id:'vanexel_97', name:'Nick Van Exel',        pos:'PG', ppg:14.9, rpg:2.9,  apg:6.5, spg:1.0, bpg:0.1, archetype:'Playmaker'         },
  ],
  Lakers_2000s: [
    { id:'kobe_06',    name:'Kobe Bryant',          pos:'SG', ppg:35.4, rpg:5.3,  apg:4.5, spg:1.8, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'shaq_02',    name:"Shaquille O'Neal",     pos:'C',  ppg:27.5, rpg:11.8, apg:3.1, spg:0.7, bpg:2.3, archetype:'Paint Beast'       },
    { id:'gasol_09',   name:'Pau Gasol',            pos:'PF', ppg:18.3, rpg:9.6,  apg:3.5, spg:0.7, bpg:1.9, archetype:'Two-Way Star'      },
    { id:'odom_04',    name:'Lamar Odom',           pos:'PF', ppg:17.1, rpg:9.4,  apg:3.5, spg:1.1, bpg:0.6, archetype:'Two-Way Star'      },
  ],
  Lakers_2010s: [
    { id:'kobe_13',    name:'Kobe Bryant',          pos:'SG', ppg:27.3, rpg:5.6,  apg:6.0, spg:1.4, bpg:0.3, archetype:'Two-Way Star'      },
    { id:'lebron_18',  name:'LeBron James',         pos:'SF', ppg:35.5, rpg:9.5,  apg:11.0, spg:2.2, bpg:1.5, archetype:'Playmaker'         },
    { id:'davis_19',   name:'Anthony Davis',        pos:'C',  ppg:23.8, rpg:10.3, apg:2.3, spg:1.1, bpg:2.4, archetype:'Two-Way Star'      },
    { id:'dwight_13',  name:'Dwight Howard',        pos:'C',  ppg:17.1, rpg:12.4, apg:1.4, spg:0.8, bpg:2.4, archetype:'Paint Beast'       },
  ],
  Lakers_2020s: [
    { id:'lebron_23',  name:'LeBron James',         pos:'SF', ppg:34.0, rpg:9.0,  apg:9.5,  spg:2.0, bpg:1.2, archetype:'Playmaker'         },
    { id:'davis_23',   name:'Anthony Davis',        pos:'C',  ppg:25.9, rpg:12.5, apg:2.6, spg:1.1, bpg:2.0, archetype:'Two-Way Star'      },
    { id:'russ_22',    name:'Russell Westbrook',    pos:'PG', ppg:19.3, rpg:8.1,  apg:7.4, spg:1.1, bpg:0.3, archetype:'Slasher'           },
  ],

  // ── BULLS ────────────────────────────────────────────────────────────────────
  Bulls_1980s: [
    { id:'mj_88',      name:'Michael Jordan',       pos:'SG', ppg:40.0, rpg:8.0,  apg:8.0,  spg:4.5, bpg:2.5, archetype:'Two-Way Star'      },
    { id:'pippen_88',  name:'Scottie Pippen',       pos:'SF', ppg:10.0, rpg:5.0,  apg:3.5, spg:1.5, bpg:0.7, archetype:'Lockdown Defender' },
    { id:'grant_89',   name:'Horace Grant',         pos:'PF', ppg:12.0, rpg:8.8,  apg:2.2, spg:1.1, bpg:0.9, archetype:'Paint Beast'       },
  ],
  Bulls_1990s: [
    { id:'mj_96',      name:'Michael Jordan',       pos:'SG', ppg:38.5, rpg:7.5,  apg:7.0,  spg:3.5, bpg:1.5, archetype:'Two-Way Star'      },
    { id:'pippen_96',  name:'Scottie Pippen',       pos:'SF', ppg:19.4, rpg:8.0,  apg:5.9, spg:2.0, bpg:0.8, archetype:'Two-Way Star'      },
    { id:'rodman_96',  name:'Dennis Rodman',        pos:'PF', ppg:5.7,  rpg:15.3, apg:2.5, spg:0.7, bpg:0.5, archetype:'Paint Beast'       },
    { id:'longley_96', name:'Luc Longley',          pos:'C',  ppg:9.1,  rpg:5.5,  apg:2.0, spg:0.5, bpg:0.9, archetype:'Paint Beast'       },
  ],
  Bulls_2000s: [
    { id:'deng_08',    name:'Luol Deng',            pos:'SF', ppg:17.9, rpg:7.0,  apg:2.6, spg:1.3, bpg:0.6, archetype:'Two-Way Star'      },
    { id:'gordon_06',  name:'Ben Gordon',           pos:'SG', ppg:16.5, rpg:2.8,  apg:3.2, spg:0.8, bpg:0.1, archetype:'Sharpshooter'      },
    { id:'hinrich_07', name:'Kirk Hinrich',         pos:'PG', ppg:14.9, rpg:3.9,  apg:5.6, spg:1.4, bpg:0.2, archetype:'Playmaker'         },
    { id:'nocioni_06', name:'Andres Nocioni',       pos:'SF', ppg:13.3, rpg:5.8,  apg:2.0, spg:1.0, bpg:0.3, archetype:'Slasher'           },
  ],
  Bulls_2010s: [
    { id:'rose_11',    name:'Derrick Rose',         pos:'PG', ppg:25.0, rpg:4.7,  apg:7.7, spg:1.0, bpg:0.6, archetype:'Slasher'           },
    { id:'butler_17',  name:'Jimmy Butler',         pos:'SG', ppg:23.9, rpg:6.0,  apg:5.5, spg:1.9, bpg:0.5, archetype:'Two-Way Star'      },
    { id:'noah_14',    name:'Joakim Noah',          pos:'C',  ppg:12.6, rpg:11.3, apg:5.4, spg:1.0, bpg:1.6, archetype:'Playmaker'         },
    { id:'boozer_11',  name:'Carlos Boozer',        pos:'PF', ppg:17.3, rpg:9.5,  apg:2.3, spg:0.7, bpg:0.5, archetype:'Paint Beast'       },
  ],

  // ── WARRIORS ─────────────────────────────────────────────────────────────────
  Warriors_1990s: [
    { id:'hardaway_92',name:'Tim Hardaway',         pos:'PG', ppg:22.0, rpg:4.0,  apg:10.0,spg:2.1, bpg:0.2, archetype:'Playmaker'         },
    { id:'mullin_92',  name:'Chris Mullin',         pos:'SF', ppg:25.1, rpg:5.1,  apg:4.5, spg:1.7, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'sprewell_97',name:'Latrell Sprewell',     pos:'SG', ppg:24.2, rpg:4.7,  apg:4.2, spg:1.9, bpg:0.4, archetype:'Slasher'           },
    { id:'webber_94',  name:'Chris Webber',         pos:'PF', ppg:17.5, rpg:9.1,  apg:3.6, spg:1.7, bpg:2.2, archetype:'Two-Way Star'      },
  ],
  Warriors_2000s: [
    { id:'baron_07',   name:'Baron Davis',          pos:'PG', ppg:21.0, rpg:4.7,  apg:8.1, spg:1.9, bpg:0.4, archetype:'Playmaker'         },
    { id:'monta_09',   name:'Monta Ellis',          pos:'SG', ppg:25.5, rpg:3.8,  apg:4.5, spg:2.0, bpg:0.2, archetype:'Slasher'           },
    { id:'jackson_04', name:'Stephen Jackson',      pos:'SF', ppg:14.8, rpg:4.4,  apg:3.3, spg:1.5, bpg:0.4, archetype:'Slasher'           },
  ],
  Warriors_2010s: [
    { id:'curry_16',   name:'Stephen Curry',        pos:'PG', ppg:30.1, rpg:5.4,  apg:6.7, spg:2.1, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'durant_18',  name:'Kevin Durant',         pos:'SF', ppg:26.4, rpg:6.8,  apg:5.4, spg:0.7, bpg:1.8, archetype:'Sharpshooter'      },
    { id:'thompson_16',name:'Klay Thompson',        pos:'SG', ppg:22.3, rpg:3.8,  apg:2.1, spg:0.9, bpg:0.6, archetype:'Sharpshooter'      },
    { id:'green_16',   name:'Draymond Green',       pos:'PF', ppg:11.7, rpg:8.0,  apg:7.4, spg:1.7, bpg:1.4, archetype:'Playmaker'         },
    { id:'iguodala_15',name:'Andre Iguodala',       pos:'SG', ppg:7.6,  rpg:4.0,  apg:3.4, spg:1.6, bpg:0.6, archetype:'Lockdown Defender' },
  ],
  Warriors_2020s: [
    { id:'curry_22',   name:'Stephen Curry',        pos:'PG', ppg:29.5, rpg:6.1,  apg:6.3, spg:1.3, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'thompson_22',name:'Klay Thompson',        pos:'SG', ppg:20.4, rpg:3.8,  apg:2.4, spg:0.7, bpg:0.5, archetype:'Sharpshooter'      },
    { id:'green_22',   name:'Draymond Green',       pos:'PF', ppg:8.7,  rpg:7.3,  apg:7.1, spg:1.5, bpg:1.2, archetype:'Playmaker'         },
  ],

  // ── CELTICS ──────────────────────────────────────────────────────────────────
  Celtics_1960s: [
    { id:'russell_65', name:'Bill Russell',         pos:'C',  ppg:15.1, rpg:22.5, apg:4.7, spg:0.7, bpg:4.5, archetype:'Lockdown Defender' },
    { id:'havlicek_68',name:'John Havlicek',        pos:'SF', ppg:20.8, rpg:7.5,  apg:4.8, spg:1.0, bpg:0.4, archetype:'Two-Way Star'      },
    { id:'jones_65',   name:'Sam Jones',            pos:'SG', ppg:19.4, rpg:5.0,  apg:4.0, spg:0.7, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'heinsohn_62',name:'Tom Heinsohn',         pos:'PF', ppg:18.8, rpg:8.8,  apg:2.5, spg:0.6, bpg:0.5, archetype:'Slasher'           },
  ],
  Celtics_1970s: [
    { id:'cowens_74',  name:'Dave Cowens',          pos:'C',  ppg:20.0, rpg:15.7, apg:4.1, spg:1.0, bpg:1.1, archetype:'Paint Beast'       },
    { id:'havlicek_74',name:'John Havlicek',        pos:'SF', ppg:22.6, rpg:6.0,  apg:5.8, spg:1.5, bpg:0.5, archetype:'Two-Way Star'      },
    { id:'white_74',   name:'Jo Jo White',          pos:'PG', ppg:19.4, rpg:4.4,  apg:5.1, spg:0.9, bpg:0.2, archetype:'Sharpshooter'      },
  ],
  Celtics_1980s: [
    { id:'bird_86',    name:'Larry Bird',           pos:'SF', ppg:25.8, rpg:10.0, apg:6.8, spg:1.8, bpg:0.9, archetype:'Two-Way Star'      },
    { id:'mchale_87',  name:'Kevin McHale',         pos:'PF', ppg:22.3, rpg:8.7,  apg:2.6, spg:0.6, bpg:2.0, archetype:'Paint Beast'       },
    { id:'parish_86',  name:'Robert Parish',        pos:'C',  ppg:18.3, rpg:10.0, apg:1.8, spg:0.8, bpg:1.5, archetype:'Paint Beast'       },
    { id:'ainge_87',   name:'Danny Ainge',          pos:'PG', ppg:12.3, rpg:3.1,  apg:5.1, spg:1.2, bpg:0.1, archetype:'Sharpshooter'      },
    { id:'johnson_86', name:'Dennis Johnson',       pos:'SG', ppg:15.6, rpg:4.2,  apg:7.0, spg:1.6, bpg:0.4, archetype:'Playmaker'         },
  ],
  Celtics_1990s: [
    { id:'lewis_92',   name:'Reggie Lewis',         pos:'SG', ppg:20.8, rpg:4.6,  apg:3.0, spg:1.3, bpg:0.8, archetype:'Sharpshooter'      },
    { id:'pierce_99',  name:'Paul Pierce',          pos:'SF', ppg:19.5, rpg:5.4,  apg:3.2, spg:1.3, bpg:0.5, archetype:'Slasher'           },
    { id:'walker_99',  name:'Antoine Walker',       pos:'PF', ppg:22.4, rpg:10.1, apg:4.5, spg:1.4, bpg:0.7, archetype:'Paint Beast'       },
  ],
  Celtics_2000s: [
    { id:'pierce_06',  name:'Paul Pierce',          pos:'SF', ppg:26.8, rpg:6.7,  apg:4.7, spg:1.3, bpg:0.7, archetype:'Slasher'           },
    { id:'garnett_08', name:'Kevin Garnett',        pos:'PF', ppg:18.8, rpg:9.2,  apg:3.4, spg:1.1, bpg:1.3, archetype:'Two-Way Star'      },
    { id:'allen_08',   name:'Ray Allen',            pos:'SG', ppg:17.4, rpg:3.9,  apg:2.6, spg:1.0, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'rondo_09',   name:'Rajon Rondo',          pos:'PG', ppg:11.9, rpg:5.0,  apg:8.2, spg:2.5, bpg:0.3, archetype:'Playmaker'         },
  ],
  Celtics_2010s: [
    { id:'irving_18',  name:'Kyrie Irving',         pos:'PG', ppg:24.4, rpg:3.8,  apg:5.1, spg:1.1, bpg:0.3, archetype:'Slasher'           },
    { id:'tatum_19',   name:'Jayson Tatum',         pos:'SF', ppg:15.7, rpg:6.0,  apg:2.1, spg:1.0, bpg:0.9, archetype:'Two-Way Star'      },
    { id:'brown_19',   name:'Jaylen Brown',         pos:'SG', ppg:13.0, rpg:4.2,  apg:1.4, spg:0.9, bpg:0.4, archetype:'Slasher'           },
    { id:'horford_17', name:'Al Horford',           pos:'C',  ppg:14.0, rpg:6.7,  apg:5.0, spg:0.9, bpg:1.6, archetype:'Two-Way Star'      },
  ],
  Celtics_2020s: [
    { id:'tatum_24',   name:'Jayson Tatum',         pos:'SF', ppg:26.9, rpg:8.1,  apg:4.9, spg:1.0, bpg:0.6, archetype:'Two-Way Star'      },
    { id:'brown_24',   name:'Jaylen Brown',         pos:'SG', ppg:23.0, rpg:5.5,  apg:3.6, spg:1.2, bpg:0.5, archetype:'Slasher'           },
    { id:'white_24',   name:'Derrick White',        pos:'PG', ppg:15.2, rpg:4.3,  apg:5.2, spg:1.4, bpg:1.1, archetype:'Two-Way Star'      },
    { id:'porzingis_24',name:'Kristaps Porzingis',  pos:'C',  ppg:20.1, rpg:7.2,  apg:1.9, spg:0.7, bpg:1.9, archetype:'Sharpshooter'      },
  ],

  // ── HEAT ─────────────────────────────────────────────────────────────────────
  Heat_1990s: [
    { id:'mourning_97',name:'Alonzo Mourning',      pos:'C',  ppg:23.9, rpg:9.7,  apg:1.2, spg:0.7, bpg:3.9, archetype:'Lockdown Defender' },
    { id:'hardaway_97',name:'Tim Hardaway',         pos:'PG', ppg:20.3, rpg:3.6,  apg:8.0, spg:1.9, bpg:0.2, archetype:'Playmaker'         },
    { id:'mashburn_99',name:'Jamal Mashburn',       pos:'SF', ppg:21.6, rpg:5.7,  apg:4.3, spg:1.2, bpg:0.4, archetype:'Slasher'           },
    { id:'rice_96',    name:'Glen Rice',            pos:'SG', ppg:22.3, rpg:4.3,  apg:2.5, spg:1.0, bpg:0.2, archetype:'Sharpshooter'      },
  ],
  Heat_2000s: [
    { id:'wade_06',    name:'Dwyane Wade',          pos:'SG', ppg:27.2, rpg:5.7,  apg:6.7, spg:1.9, bpg:0.9, archetype:'Slasher'           },
    { id:'shaq_05',    name:"Shaquille O'Neal",     pos:'C',  ppg:22.9, rpg:10.4, apg:2.7, spg:0.5, bpg:2.3, archetype:'Paint Beast'       },
    { id:'haslem_07',  name:'Udonis Haslem',        pos:'PF', ppg:9.7,  rpg:8.4,  apg:0.9, spg:0.6, bpg:0.5, archetype:'Paint Beast'       },
  ],
  Heat_2010s: [
    { id:'lebron_13',  name:'LeBron James',         pos:'SF', ppg:36.0, rpg:10.0, apg:10.0, spg:2.5, bpg:1.8, archetype:'Two-Way Star'      },
    { id:'wade_13',    name:'Dwyane Wade',          pos:'SG', ppg:21.2, rpg:4.8,  apg:4.9, spg:1.7, bpg:0.8, archetype:'Slasher'           },
    { id:'bosh_13',    name:'Chris Bosh',           pos:'PF', ppg:18.0, rpg:7.9,  apg:1.9, spg:0.8, bpg:1.9, archetype:'Two-Way Star'      },
    { id:'chalmers_12',name:'Mario Chalmers',       pos:'PG', ppg:10.2, rpg:2.9,  apg:4.4, spg:1.4, bpg:0.2, archetype:'Playmaker'         },
  ],
  Heat_2020s: [
    { id:'butler_23',  name:'Jimmy Butler',         pos:'SF', ppg:22.9, rpg:5.9,  apg:5.3, spg:1.8, bpg:0.3, archetype:'Two-Way Star'      },
    { id:'adebayo_23', name:'Bam Adebayo',          pos:'C',  ppg:20.4, rpg:9.2,  apg:3.2, spg:1.2, bpg:0.8, archetype:'Two-Way Star'      },
    { id:'herro_23',   name:'Tyler Herro',          pos:'SG', ppg:20.1, rpg:5.4,  apg:4.2, spg:0.8, bpg:0.3, archetype:'Sharpshooter'      },
    { id:'lowry_22',   name:'Kyle Lowry',           pos:'PG', ppg:14.0, rpg:4.2,  apg:7.5, spg:1.2, bpg:0.3, archetype:'Playmaker'         },
  ],

  // ── SPURS ────────────────────────────────────────────────────────────────────
  Spurs_1980s: [
    { id:'gervin_85',  name:'George Gervin',        pos:'SG', ppg:26.2, rpg:4.6,  apg:3.0, spg:1.3, bpg:0.5, archetype:'Sharpshooter'      },
    { id:'mitchell_85',name:'Mike Mitchell',        pos:'SF', ppg:23.4, rpg:5.1,  apg:2.2, spg:1.0, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'robertson_85',name:'Alvin Robertson',     pos:'SG', ppg:13.3, rpg:4.9,  apg:5.2, spg:3.7, bpg:0.6, archetype:'Lockdown Defender' },
  ],
  Spurs_1990s: [
    { id:'robinson_95',name:'David Robinson',       pos:'C',  ppg:27.6, rpg:10.8, apg:2.6, spg:1.7, bpg:3.4, archetype:'Two-Way Star'      },
    { id:'elliott_95', name:'Sean Elliott',         pos:'SF', ppg:18.5, rpg:4.9,  apg:2.8, spg:1.0, bpg:0.5, archetype:'Sharpshooter'      },
    { id:'duncan_99',  name:'Tim Duncan',           pos:'PF', ppg:21.1, rpg:11.9, apg:2.4, spg:0.8, bpg:2.5, archetype:'Two-Way Star'      },
  ],
  Spurs_2000s: [
    { id:'duncan_03',  name:'Tim Duncan',           pos:'PF', ppg:23.3, rpg:12.9, apg:3.9, spg:0.9, bpg:2.9, archetype:'Two-Way Star'      },
    { id:'parker_07',  name:'Tony Parker',          pos:'PG', ppg:18.6, rpg:3.4,  apg:5.5, spg:0.8, bpg:0.2, archetype:'Slasher'           },
    { id:'ginobili_05',name:'Manu Ginobili',        pos:'SG', ppg:16.0, rpg:4.1,  apg:4.4, spg:1.5, bpg:0.4, archetype:'Slasher'           },
    { id:'bowen_03',   name:'Bruce Bowen',          pos:'SF', ppg:7.4,  rpg:3.0,  apg:1.3, spg:1.5, bpg:0.4, archetype:'Lockdown Defender' },
  ],
  Spurs_2010s: [
    { id:'kawhi_16',   name:'Kawhi Leonard',        pos:'SF', ppg:21.2, rpg:6.8,  apg:2.6, spg:1.8, bpg:0.7, archetype:'Two-Way Star'      },
    { id:'aldridge_16',name:'LaMarcus Aldridge',    pos:'PF', ppg:21.9, rpg:9.0,  apg:2.2, spg:0.6, bpg:1.3, archetype:'Paint Beast'       },
    { id:'parker_12',  name:'Tony Parker',          pos:'PG', ppg:21.1, rpg:3.0,  apg:7.7, spg:0.8, bpg:0.1, archetype:'Slasher'           },
    { id:'duncan_14',  name:'Tim Duncan',           pos:'C',  ppg:15.1, rpg:9.7,  apg:3.0, spg:0.7, bpg:2.0, archetype:'Two-Way Star'      },
  ],

  // ── KNICKS ───────────────────────────────────────────────────────────────────
  Knicks_1970s: [
    { id:'frazier_72', name:'Walt Frazier',         pos:'PG', ppg:21.5, rpg:7.0,  apg:7.1, spg:2.5, bpg:0.5, archetype:'Two-Way Star'      },
    { id:'reed_70',    name:'Willis Reed',          pos:'C',  ppg:21.7, rpg:13.7, apg:1.8, spg:0.8, bpg:1.4, archetype:'Paint Beast'       },
    { id:'bradley_72', name:'Bill Bradley',         pos:'SF', ppg:16.1, rpg:3.7,  apg:4.0, spg:0.7, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'monroe_71',  name:'Earl Monroe',          pos:'SG', ppg:21.2, rpg:3.3,  apg:4.6, spg:1.0, bpg:0.2, archetype:'Slasher'           },
  ],
  Knicks_1990s: [
    { id:'ewing_94',   name:'Patrick Ewing',        pos:'C',  ppg:24.5, rpg:11.2, apg:2.3, spg:1.0, bpg:2.5, archetype:'Paint Beast'       },
    { id:'starks_94',  name:'John Starks',          pos:'SG', ppg:15.5, rpg:3.2,  apg:4.4, spg:1.5, bpg:0.2, archetype:'Slasher'           },
    { id:'oakley_94',  name:'Charles Oakley',       pos:'PF', ppg:11.7, rpg:10.8, apg:2.5, spg:1.2, bpg:0.3, archetype:'Paint Beast'       },
    { id:'houston_99', name:'Allan Houston',        pos:'SG', ppg:21.7, rpg:3.6,  apg:3.0, spg:0.9, bpg:0.2, archetype:'Sharpshooter'      },
  ],
  Knicks_2000s: [
    { id:'marbury_03', name:'Stephon Marbury',      pos:'PG', ppg:20.9, rpg:3.6,  apg:8.9, spg:1.4, bpg:0.2, archetype:'Playmaker'         },
    { id:'crawford_06',name:'Jamal Crawford',       pos:'SG', ppg:17.4, rpg:2.6,  apg:3.8, spg:1.0, bpg:0.2, archetype:'Slasher'           },
    { id:'lee_09',     name:'David Lee',            pos:'PF', ppg:16.3, rpg:11.7, apg:1.7, spg:0.9, bpg:0.3, archetype:'Paint Beast'       },
  ],
  Knicks_2010s: [
    { id:'melo_13',    name:'Carmelo Anthony',      pos:'SF', ppg:28.7, rpg:6.9,  apg:2.6, spg:0.8, bpg:0.5, archetype:'Sharpshooter'      },
    { id:'amare_11',   name:"Amar'e Stoudemire",    pos:'PF', ppg:25.3, rpg:8.8,  apg:2.2, spg:0.8, bpg:1.0, archetype:'Slasher'           },
    { id:'chandler_12',name:'Tyson Chandler',       pos:'C',  ppg:10.1, rpg:10.8, apg:0.9, spg:0.7, bpg:1.3, archetype:'Lockdown Defender' },
  ],

  // ── JAZZ ─────────────────────────────────────────────────────────────────────
  Jazz_1980s: [
    { id:'malone_88',  name:'Karl Malone',          pos:'PF', ppg:27.7, rpg:10.3, apg:2.9, spg:1.4, bpg:0.8, archetype:'Paint Beast'       },
    { id:'stockton_88',name:'John Stockton',        pos:'PG', ppg:14.7, rpg:2.8,  apg:13.8,spg:3.2, bpg:0.2, archetype:'Playmaker'         },
    { id:'griffith_85',name:'Darrell Griffith',     pos:'SG', ppg:22.6, rpg:4.6,  apg:3.0, spg:1.4, bpg:0.4, archetype:'Sharpshooter'      },
  ],
  Jazz_1990s: [
    { id:'malone_97',  name:'Karl Malone',          pos:'PF', ppg:27.4, rpg:9.9,  apg:4.5, spg:1.4, bpg:0.7, archetype:'Paint Beast'       },
    { id:'stockton_97',name:'John Stockton',        pos:'PG', ppg:14.1, rpg:2.7,  apg:10.5,spg:2.6, bpg:0.2, archetype:'Playmaker'         },
    { id:'hornacek_96',name:'Jeff Hornacek',        pos:'SG', ppg:15.0, rpg:3.4,  apg:4.3, spg:1.5, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'ostertag_97',name:'Greg Ostertag',        pos:'C',  ppg:5.8,  rpg:7.1,  apg:0.8, spg:0.6, bpg:1.9, archetype:'Lockdown Defender' },
  ],
  Jazz_2000s: [
    { id:'boozer_08',  name:'Carlos Boozer',        pos:'PF', ppg:21.1, rpg:11.7, apg:2.4, spg:0.8, bpg:0.5, archetype:'Paint Beast'       },
    { id:'deron_08',   name:'Deron Williams',       pos:'PG', ppg:19.5, rpg:3.4,  apg:10.5,spg:1.0, bpg:0.3, archetype:'Playmaker'         },
    { id:'okur_07',    name:'Mehmet Okur',          pos:'C',  ppg:17.4, rpg:8.4,  apg:2.2, spg:0.5, bpg:1.3, archetype:'Sharpshooter'      },
  ],
  Jazz_2010s: [
    { id:'hayward_16', name:'Gordon Hayward',       pos:'SF', ppg:21.9, rpg:5.4,  apg:3.5, spg:1.1, bpg:0.5, archetype:'Two-Way Star'      },
    { id:'gobert_17',  name:'Rudy Gobert',          pos:'C',  ppg:14.0, rpg:12.8, apg:1.3, spg:0.7, bpg:2.6, archetype:'Lockdown Defender' },
    { id:'mitchell_19',name:'Donovan Mitchell',     pos:'SG', ppg:24.4, rpg:4.4,  apg:4.2, spg:1.5, bpg:0.3, archetype:'Slasher'           },
    { id:'ingles_18',  name:'Joe Ingles',           pos:'SF', ppg:13.0, rpg:4.4,  apg:5.0, spg:1.4, bpg:0.4, archetype:'Sharpshooter'      },
  ],

  // ── PISTONS ──────────────────────────────────────────────────────────────────
  Pistons_1980s: [
    { id:'isiah_89',   name:'Isiah Thomas',         pos:'PG', ppg:19.5, rpg:3.6,  apg:9.3, spg:1.9, bpg:0.2, archetype:'Playmaker'         },
    { id:'dumars_89',  name:'Joe Dumars',           pos:'SG', ppg:17.2, rpg:2.9,  apg:4.4, spg:1.1, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'laimbeer_89',name:'Bill Laimbeer',        pos:'C',  ppg:13.7, rpg:9.6,  apg:2.5, spg:0.8, bpg:1.1, archetype:'Paint Beast'       },
    { id:'rodman_89',  name:'Dennis Rodman',        pos:'PF', ppg:9.0,  rpg:9.4,  apg:1.1, spg:0.7, bpg:0.8, archetype:'Lockdown Defender' },
    { id:'dantley_87', name:'Adrian Dantley',       pos:'SF', ppg:21.5, rpg:4.9,  apg:2.4, spg:0.9, bpg:0.3, archetype:'Slasher'           },
  ],
  Pistons_1990s: [
    { id:'hill_96',    name:'Grant Hill',           pos:'SF', ppg:21.6, rpg:7.9,  apg:6.3, spg:1.6, bpg:0.7, archetype:'Two-Way Star'      },
    { id:'stackhouse_97',name:'Jerry Stackhouse',  pos:'SG', ppg:19.4, rpg:3.4,  apg:3.4, spg:1.1, bpg:0.5, archetype:'Slasher'           },
    { id:'dumars_93',  name:'Joe Dumars',           pos:'SG', ppg:22.1, rpg:2.9,  apg:4.8, spg:1.0, bpg:0.2, archetype:'Sharpshooter'      },
  ],
  Pistons_2000s: [
    { id:'billups_04', name:'Chauncey Billups',     pos:'PG', ppg:18.1, rpg:3.3,  apg:5.7, spg:1.1, bpg:0.2, archetype:'Playmaker'         },
    { id:'rasheed_04', name:'Rasheed Wallace',      pos:'PF', ppg:15.7, rpg:7.0,  apg:1.7, spg:0.8, bpg:1.6, archetype:'Two-Way Star'      },
    { id:'hamilton_04',name:'Richard Hamilton',     pos:'SG', ppg:17.6, rpg:3.2,  apg:3.2, spg:0.9, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'prince_04',  name:'Tayshaun Prince',      pos:'SF', ppg:13.5, rpg:5.0,  apg:2.1, spg:0.7, bpg:0.9, archetype:'Lockdown Defender' },
    { id:'ben_04',     name:'Ben Wallace',          pos:'C',  ppg:9.5,  rpg:13.2, apg:1.9, spg:1.5, bpg:3.0, archetype:'Lockdown Defender' },
  ],

  // ── MAGIC ────────────────────────────────────────────────────────────────────
  Magic_1990s: [
    { id:'shaq_94',    name:"Shaquille O'Neal",     pos:'C',  ppg:29.3, rpg:13.2, apg:3.4, spg:0.9, bpg:2.5, archetype:'Paint Beast'       },
    { id:'penny_95',   name:'Anfernee Hardaway',    pos:'PG', ppg:22.9, rpg:7.2,  apg:7.2, spg:2.0, bpg:0.8, archetype:'Playmaker'         },
    { id:'anderson_95',name:'Nick Anderson',        pos:'SG', ppg:15.0, rpg:5.3,  apg:2.7, spg:1.7, bpg:0.6, archetype:'Sharpshooter'      },
    { id:'horace_95',  name:'Horace Grant',         pos:'PF', ppg:12.0, rpg:9.0,  apg:3.0, spg:1.5, bpg:1.0, archetype:'Two-Way Star'      },
  ],
  Magic_2000s: [
    { id:'tmac_03',    name:'Tracy McGrady',        pos:'SG', ppg:32.1, rpg:6.5,  apg:5.5, spg:1.7, bpg:0.8, archetype:'Slasher'           },
    { id:'dwight_09',  name:'Dwight Howard',        pos:'C',  ppg:20.6, rpg:13.8, apg:1.4, spg:0.9, bpg:2.9, archetype:'Paint Beast'       },
    { id:'turkoglu_08',name:'Hedo Turkoglu',        pos:'SF', ppg:19.5, rpg:5.7,  apg:5.6, spg:0.9, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'lewis_09',   name:'Rashard Lewis',        pos:'PF', ppg:18.2, rpg:5.7,  apg:2.1, spg:1.0, bpg:0.5, archetype:'Sharpshooter'      },
  ],
  Magic_2010s: [
    { id:'dwight_11',  name:'Dwight Howard',        pos:'C',  ppg:22.9, rpg:14.1, apg:1.9, spg:0.8, bpg:2.5, archetype:'Lockdown Defender' },
    { id:'vucevic_14', name:'Nikola Vucevic',       pos:'C',  ppg:16.3, rpg:10.0, apg:3.2, spg:0.7, bpg:1.1, archetype:'Paint Beast'       },
    { id:'gordon_18',  name:'Aaron Gordon',         pos:'PF', ppg:16.0, rpg:7.6,  apg:3.3, spg:0.9, bpg:0.8, archetype:'Slasher'           },
  ],

  // ── SUNS ─────────────────────────────────────────────────────────────────────
  Suns_1970s: [
    { id:'westphal_77',name:'Paul Westphal',        pos:'SG', ppg:24.0, rpg:3.6,  apg:5.6, spg:2.0, bpg:0.3, archetype:'Sharpshooter'      },
    { id:'adams_76',   name:'Alvan Adams',          pos:'C',  ppg:19.2, rpg:9.2,  apg:5.2, spg:1.5, bpg:1.5, archetype:'Two-Way Star'      },
    { id:'scott_76',   name:'Charlie Scott',        pos:'PG', ppg:24.3, rpg:4.3,  apg:6.2, spg:1.8, bpg:0.3, archetype:'Slasher'           },
  ],
  Suns_1990s: [
    { id:'barkley_93', name:'Charles Barkley',      pos:'PF', ppg:25.6, rpg:12.2, apg:5.1, spg:1.6, bpg:1.0, archetype:'Two-Way Star'      },
    { id:'kj_93',      name:'Kevin Johnson',        pos:'PG', ppg:20.4, rpg:4.3,  apg:10.6,spg:1.7, bpg:0.3, archetype:'Playmaker'         },
    { id:'majerle_93', name:'Dan Majerle',          pos:'SG', ppg:16.8, rpg:5.1,  apg:3.5, spg:1.8, bpg:0.5, archetype:'Two-Way Star'      },
    { id:'manning_93', name:'Danny Manning',        pos:'SF', ppg:18.9, rpg:6.8,  apg:2.7, spg:1.0, bpg:0.7, archetype:'Slasher'           },
  ],
  Suns_2000s: [
    { id:'nash_06',    name:'Steve Nash',           pos:'PG', ppg:18.8, rpg:4.3,  apg:10.5,spg:0.8, bpg:0.1, archetype:'Playmaker'         },
    { id:'amare_06',   name:"Amar'e Stoudemire",    pos:'PF', ppg:26.0, rpg:9.0,  apg:1.9, spg:0.9, bpg:1.6, archetype:'Slasher'           },
    { id:'marion_06',  name:'Shawn Marion',         pos:'SF', ppg:19.0, rpg:11.2, apg:2.5, spg:1.9, bpg:1.5, archetype:'Two-Way Star'      },
    { id:'barbosa_07', name:'Leandro Barbosa',      pos:'SG', ppg:18.1, rpg:2.6,  apg:4.2, spg:0.8, bpg:0.2, archetype:'Slasher'           },
  ],
  Suns_2020s: [
    { id:'booker_22',  name:'Devin Booker',         pos:'SG', ppg:27.8, rpg:5.0,  apg:4.7, spg:0.9, bpg:0.3, archetype:'Sharpshooter'      },
    { id:'durant_23',  name:'Kevin Durant',         pos:'SF', ppg:29.1, rpg:6.7,  apg:5.0, spg:0.8, bpg:1.4, archetype:'Sharpshooter'      },
    { id:'beal_23',    name:'Bradley Beal',         pos:'SG', ppg:18.2, rpg:4.4,  apg:5.0, spg:1.0, bpg:0.4, archetype:'Sharpshooter'      },
  ],

  // ── NUGGETS ──────────────────────────────────────────────────────────────────
  Nuggets_1980s: [
    { id:'english_83', name:'Alex English',         pos:'SF', ppg:28.4, rpg:6.0,  apg:4.0, spg:1.0, bpg:0.6, archetype:'Sharpshooter'      },
    { id:'lever_88',   name:'Fat Lever',            pos:'PG', ppg:19.7, rpg:8.9,  apg:8.0, spg:3.1, bpg:0.4, archetype:'Two-Way Star'      },
    { id:'rasmussen_88',name:'Blair Rasmussen',     pos:'C',  ppg:13.0, rpg:7.5,  apg:1.0, spg:0.6, bpg:1.4, archetype:'Paint Beast'       },
  ],
  Nuggets_2000s: [
    { id:'melo_06',    name:'Carmelo Anthony',      pos:'SF', ppg:26.5, rpg:4.9,  apg:2.8, spg:1.0, bpg:0.5, archetype:'Sharpshooter'      },
    { id:'iverson_07', name:'Allen Iverson',        pos:'PG', ppg:26.4, rpg:3.8,  apg:7.4, spg:1.8, bpg:0.1, archetype:'Slasher'           },
    { id:'camby_07',   name:'Marcus Camby',         pos:'C',  ppg:11.0, rpg:12.8, apg:1.9, spg:1.2, bpg:3.3, archetype:'Lockdown Defender' },
    { id:'martin_07',  name:'Kenyon Martin',        pos:'PF', ppg:13.2, rpg:7.2,  apg:1.8, spg:0.8, bpg:1.2, archetype:'Lockdown Defender' },
  ],
  Nuggets_2010s: [
    { id:'jokic_19',   name:'Nikola Jokic',         pos:'C',  ppg:20.1, rpg:10.8, apg:6.9, spg:1.4, bpg:0.7, archetype:'Playmaker'         },
    { id:'murray_19',  name:'Jamal Murray',         pos:'PG', ppg:18.2, rpg:4.2,  apg:4.8, spg:0.9, bpg:0.2, archetype:'Sharpshooter'      },
    { id:'melo_11',    name:'Carmelo Anthony',      pos:'SF', ppg:28.2, rpg:6.1,  apg:3.0, spg:1.3, bpg:0.4, archetype:'Sharpshooter'      },
  ],
  Nuggets_2020s: [
    { id:'jokic_23',   name:'Nikola Jokic',         pos:'C',  ppg:26.4, rpg:12.4, apg:9.0, spg:1.3, bpg:0.7, archetype:'Playmaker'         },
    { id:'murray_23',  name:'Jamal Murray',         pos:'PG', ppg:21.2, rpg:4.1,  apg:6.2, spg:1.0, bpg:0.4, archetype:'Sharpshooter'      },
    { id:'porter_23',  name:'Michael Porter Jr.',   pos:'SF', ppg:16.7, rpg:7.4,  apg:1.5, spg:0.7, bpg:0.5, archetype:'Sharpshooter'      },
  ],

  // ── 76ERS ────────────────────────────────────────────────────────────────────
  Sixers_1960s: [
    { id:'chamberlain_67',name:'Wilt Chamberlain',  pos:'C',  ppg:24.1, rpg:24.2, apg:7.8, spg:0.7, bpg:2.5, archetype:'Paint Beast'       },
    { id:'greer_67',   name:'Hal Greer',            pos:'SG', ppg:22.1, rpg:5.3,  apg:4.4, spg:0.9, bpg:0.3, archetype:'Sharpshooter'      },
    { id:'walker_67',  name:'Chet Walker',          pos:'SF', ppg:19.3, rpg:8.1,  apg:2.8, spg:0.7, bpg:0.4, archetype:'Slasher'           },
  ],
  Sixers_1980s: [
    { id:'erving_83',  name:'Julius Erving',        pos:'SF', ppg:22.4, rpg:6.8,  apg:5.0, spg:1.9, bpg:1.4, archetype:'Two-Way Star'      },
    { id:'malone_83',  name:'Moses Malone',         pos:'C',  ppg:24.5, rpg:15.3, apg:1.3, spg:1.1, bpg:1.5, archetype:'Paint Beast'       },
    { id:'cheeks_87',  name:'Maurice Cheeks',       pos:'PG', ppg:14.0, rpg:3.2,  apg:7.7, spg:2.3, bpg:0.3, archetype:'Playmaker'         },
    { id:'toney_83',   name:'Andrew Toney',         pos:'SG', ppg:19.7, rpg:3.0,  apg:4.5, spg:1.3, bpg:0.3, archetype:'Sharpshooter'      },
  ],
  Sixers_1990s: [
    { id:'barkley_91', name:'Charles Barkley',      pos:'PF', ppg:27.6, rpg:11.1, apg:4.4, spg:1.8, bpg:0.8, archetype:'Two-Way Star'      },
    { id:'iverson_99', name:'Allen Iverson',        pos:'PG', ppg:26.8, rpg:4.9,  apg:6.1, spg:2.3, bpg:0.2, archetype:'Slasher'           },
    { id:'coleman_93', name:'Derrick Coleman',      pos:'PF', ppg:20.2, rpg:10.7, apg:3.7, spg:1.1, bpg:1.0, archetype:'Paint Beast'       },
  ],
  Sixers_2000s: [
    { id:'iverson_01', name:'Allen Iverson',        pos:'PG', ppg:31.1, rpg:4.6,  apg:4.6, spg:2.5, bpg:0.3, archetype:'Slasher'           },
    { id:'webber_05',  name:'Chris Webber',         pos:'PF', ppg:20.2, rpg:9.7,  apg:4.5, spg:1.2, bpg:0.9, archetype:'Two-Way Star'      },
    { id:'iguodala_09',name:'Andre Iguodala',       pos:'SF', ppg:14.7, rpg:5.8,  apg:6.3, spg:2.0, bpg:0.7, archetype:'Lockdown Defender' },
  ],
  Sixers_2010s: [
    { id:'embiid_19',  name:'Joel Embiid',          pos:'C',  ppg:27.5, rpg:13.6, apg:3.7, spg:0.9, bpg:3.7, archetype:'Paint Beast'       },
    { id:'simmons_19', name:'Ben Simmons',          pos:'PG', ppg:16.9, rpg:8.8,  apg:8.2, spg:1.8, bpg:0.8, archetype:'Playmaker'         },
    { id:'harris_19',  name:'Tobias Harris',        pos:'SF', ppg:19.6, rpg:7.5,  apg:3.2, spg:0.7, bpg:0.5, archetype:'Sharpshooter'      },
  ],

  // ── ROCKETS ──────────────────────────────────────────────────────────────────
  Rockets_1990s: [
    { id:'hakeem_94',  name:'Hakeem Olajuwon',      pos:'C',  ppg:27.3, rpg:11.9, apg:3.6, spg:1.6, bpg:3.7, archetype:'Two-Way Star'      },
    { id:'clyde_95',   name:'Clyde Drexler',        pos:'SG', ppg:21.4, rpg:7.0,  apg:4.4, spg:1.6, bpg:0.4, archetype:'Slasher'           },
  ],
  Rockets_2000s: [
    { id:'yao_06',     name:'Yao Ming',             pos:'C',  ppg:25.0, rpg:9.4,  apg:2.5, spg:0.6, bpg:2.0, archetype:'Paint Beast'       },
    { id:'tmac_04',    name:'Tracy McGrady',        pos:'SF', ppg:24.4, rpg:5.3,  apg:6.5, spg:1.5, bpg:0.9, archetype:'Two-Way Star'      },
  ],
  Rockets_2010s: [
    { id:'harden_19',  name:'James Harden',         pos:'SG', ppg:36.1, rpg:6.6,  apg:7.5, spg:2.0, bpg:0.7, archetype:'Playmaker'         },
    { id:'cp3_18',     name:'Chris Paul',           pos:'PG', ppg:18.6, rpg:5.4,  apg:7.9, spg:1.7, bpg:0.2, archetype:'Playmaker'         },
  ],

  // ── THUNDER / SONICS ─────────────────────────────────────────────────────────
  Thunder_1970s: [
    { id:'guswilliams_79', name:'Gus Williams',     pos:'PG', ppg:22.0, rpg:4.0,  apg:6.9, spg:2.4, bpg:0.2, archetype:'Slasher'           },
    { id:'djohnson_79',    name:'Dennis Johnson',   pos:'SG', ppg:15.9, rpg:3.9,  apg:4.7, spg:2.1, bpg:0.5, archetype:'Lockdown Defender' },
  ],
  Thunder_1990s: [
    { id:'payton_96',  name:'Gary Payton',          pos:'PG', ppg:24.2, rpg:6.5,  apg:8.9, spg:2.2, bpg:0.3, archetype:'Two-Way Star'      },
    { id:'kemp_96',    name:'Shawn Kemp',           pos:'PF', ppg:19.6, rpg:11.4, apg:2.4, spg:1.2, bpg:1.8, archetype:'Paint Beast'       },
  ],
  Thunder_2010s: [
    { id:'durant_12',  name:'Kevin Durant',         pos:'SF', ppg:32.0, rpg:7.4,  apg:5.5, spg:1.3, bpg:1.1, archetype:'Sharpshooter'      },
    { id:'russ_17',    name:'Russell Westbrook',    pos:'PG', ppg:31.6, rpg:10.7, apg:10.4, spg:1.6, bpg:0.3, archetype:'Slasher'          },
  ],
  Thunder_2020s: [
    { id:'sga_24',     name:'Shai Gilgeous-Alexander', pos:'PG', ppg:31.1, rpg:5.5, apg:6.2, spg:2.0, bpg:1.1, archetype:'Two-Way Star'   },
  ],

  // ── BUCKS ────────────────────────────────────────────────────────────────────
  Bucks_1970s: [
    { id:'kareem_71',  name:'Kareem Abdul-Jabbar',  pos:'C',  ppg:34.8, rpg:16.6, apg:4.6, spg:1.2, bpg:3.5, archetype:'Two-Way Star'      },
    { id:'oscar_71',   name:'Oscar Robertson',      pos:'PG', ppg:19.4, rpg:5.7,  apg:8.2, spg:1.2, bpg:0.2, archetype:'Playmaker'         },
  ],
  Bucks_1980s: [
    { id:'moncrief_82',name:'Sidney Moncrief',      pos:'SG', ppg:22.5, rpg:6.7,  apg:4.5, spg:1.5, bpg:0.3, archetype:'Lockdown Defender' },
    { id:'mjohnson_79',name:'Marques Johnson',      pos:'SF', ppg:20.3, rpg:7.2,  apg:3.5, spg:1.2, bpg:0.3, archetype:'Slasher'           },
  ],
  Bucks_2000s: [
    { id:'rallen_01',  name:'Ray Allen',            pos:'SG', ppg:22.0, rpg:5.2,  apg:4.6, spg:0.9, bpg:0.1, archetype:'Sharpshooter'      },
    { id:'redd_06',    name:'Michael Redd',         pos:'SG', ppg:26.7, rpg:5.1,  apg:2.3, spg:0.8, bpg:0.3, archetype:'Sharpshooter'      },
  ],
  Bucks_2020s: [
    { id:'giannis_20', name:'Giannis Antetokounmpo',pos:'PF', ppg:31.1, rpg:11.8, apg:5.7, spg:1.0, bpg:1.4, archetype:'Two-Way Star'      },
    { id:'dame_23',    name:'Damian Lillard',       pos:'PG', ppg:24.3, rpg:4.4,  apg:7.0, spg:0.9, bpg:0.3, archetype:'Sharpshooter'      },
  ],

  // ── MAVERICKS ────────────────────────────────────────────────────────────────
  Mavericks_1980s: [
    { id:'aguirre_83', name:'Mark Aguirre',         pos:'SF', ppg:25.7, rpg:5.9,  apg:3.1, spg:0.9, bpg:0.3, archetype:'Slasher'           },
    { id:'blackman_87',name:'Rolando Blackman',     pos:'SG', ppg:22.4, rpg:4.0,  apg:2.7, spg:0.9, bpg:0.1, archetype:'Sharpshooter'      },
  ],
  Mavericks_2000s: [
    { id:'dirk_07',    name:'Dirk Nowitzki',        pos:'PF', ppg:26.6, rpg:9.0,  apg:2.8, spg:0.9, bpg:0.8, archetype:'Sharpshooter'      },
    { id:'nash_02',    name:'Steve Nash',           pos:'PG', ppg:17.7, rpg:3.3,  apg:7.3, spg:0.7, bpg:0.1, archetype:'Playmaker'         },
  ],
  Mavericks_2010s: [
    { id:'dirk_11',    name:'Dirk Nowitzki',        pos:'PF', ppg:23.0, rpg:7.0,  apg:2.2, spg:0.7, bpg:0.6, archetype:'Sharpshooter'      },
    { id:'kidd_12',    name:'Jason Kidd',           pos:'PG', ppg:9.0,  rpg:6.2,  apg:8.9, spg:1.7, bpg:0.2, archetype:'Playmaker'         },
  ],
  Mavericks_2020s: [
    { id:'luka_24',    name:'Luka Doncic',          pos:'PG', ppg:33.9, rpg:9.2,  apg:9.8, spg:1.4, bpg:0.5, archetype:'Playmaker'         },
    { id:'kyrie_23',   name:'Kyrie Irving',         pos:'SG', ppg:25.6, rpg:3.9,  apg:5.2, spg:1.2, bpg:0.4, archetype:'Slasher'           },
  ],

  // ── CAVALIERS ────────────────────────────────────────────────────────────────
  Cavaliers_1980s: [
    { id:'price_89',   name:'Mark Price',           pos:'PG', ppg:19.6, rpg:2.0,  apg:8.4, spg:1.5, bpg:0.1, archetype:'Sharpshooter'      },
    { id:'daugherty_89',name:'Brad Daugherty',      pos:'C',  ppg:21.6, rpg:10.4, apg:3.4, spg:0.8, bpg:0.9, archetype:'Paint Beast'       },
  ],
  Cavaliers_1990s: [
    { id:'price_94',   name:'Mark Price',           pos:'PG', ppg:18.2, rpg:2.0,  apg:8.0, spg:1.3, bpg:0.1, archetype:'Sharpshooter'      },
    { id:'nance_90',   name:'Larry Nance',          pos:'PF', ppg:19.2, rpg:8.6,  apg:2.0, spg:1.0, bpg:2.5, archetype:'Lockdown Defender' },
  ],
  Cavaliers_2000s: [
    { id:'lebron_06',  name:'LeBron James',         pos:'SF', ppg:30.0, rpg:7.9,  apg:7.2, spg:1.8, bpg:1.1, archetype:'Two-Way Star'      },
  ],
  Cavaliers_2010s: [
    { id:'lebron_16',  name:'LeBron James',         pos:'SF', ppg:27.5, rpg:8.6,  apg:9.1, spg:1.9, bpg:1.0, archetype:'Playmaker'         },
    { id:'kyrie_16',   name:'Kyrie Irving',         pos:'PG', ppg:25.2, rpg:3.3,  apg:5.8, spg:1.2, bpg:0.4, archetype:'Slasher'           },
  ],
  Cavaliers_2020s: [
    { id:'mitchell_23',name:'Donovan Mitchell',     pos:'SG', ppg:28.3, rpg:4.3,  apg:6.1, spg:1.5, bpg:0.3, archetype:'Sharpshooter'      },
  ],
};
