"""Convert the 3.5 SRD (Markdown edition) into data/srd.json for the app.

Usage:
    git clone --depth 1 https://github.com/olimot/srd-v3.5-md
    pip install markdown beautifulsoup4 lxml
    python tools/parse_srd.py path/to/srd-v3.5-md
"""
import re, json, os
import markdown
from bs4 import BeautifulSoup

import sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'srd-v3.5-md')
B = os.path.join(ROOT, 'basic-rules-and-legal')
def rd(p): return open(p, encoding='utf-8').read()
def md(t):
    h = markdown.markdown(t.strip(), extensions=['tables'])
    h = re.sub(r'\s*class="[^"]*"', '', h)
    h = re.sub(r'\s*data-debug="[^"]*"', '', h)
    return h
def clean(s):
    s = re.sub(r'<small>|</small>', '', s)
    return s.replace('\\[', '[').replace('\\]', ']').strip()
def txt(cell):
    return re.sub(r'\s+', ' ', cell.get_text(' ', strip=True)).strip()
def strip_sup(cell):
    for s in cell.find_all('sup'): s.decompose()
    return txt(cell)

def split_sections(text, level):
    """split on headings of exact level; returns list of (title, body)"""
    pat = re.compile(r'^' + '#' * level + r' (.+)$', re.M)
    ms = list(pat.finditer(text))
    out = []
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        # stop at a higher-level heading
        body = text[m.end():end]
        hp = re.search(r'^#{1,%d} ' % (level - 1), body, re.M)
        if hp: body = body[:hp.start()]
        out.append((clean(m.group(1)), body.strip()))
    return out

# ---------------- SPELLS ----------------
spells = []
FIELDS = {'Level': 'lvl', 'Components': 'comp', 'Casting Time': 'ct', 'Range': 'rng', 'Target': 'tgt',
          'Targets': 'tgt', 'Area': 'area', 'Effect': 'eff', 'Duration': 'dur', 'Saving Throw': 'save',
          'Spell Resistance': 'sr', 'Target or Area': 'tgt', 'Target, Effect, or Area': 'tgt', 'Area or Target': 'area',
          'Target or Targets': 'tgt', 'Effect or Area':'eff', 'Target/Effect':'tgt','Target and Area':'tgt'}
for f in sorted(os.listdir(os.path.join(ROOT, 'spells'))):
    if not f.startswith('spells-'): continue
    t = rd(os.path.join(ROOT, 'spells', f))
    for name, body in split_sections(t, 2):
        lines = body.split('\n')
        sp = {'n': name}
        desc = []
        school_set = False
        for ln in lines:
            s = ln.strip()
            if not s: desc.append(''); continue
            m = re.match(r'^\*\*([^*]+?):\*\*\s*(.*)$', s)
            if m and m.group(1) in FIELDS and FIELDS[m.group(1)] not in sp:
                sp[FIELDS[m.group(1)]] = clean(re.sub(r'[_*]', '', m.group(2)))
                continue
            if not school_set and 'lvl' not in sp and not s.startswith('**'):
                sp['sch'] = clean(s); school_set = True; continue
            desc.append(ln)
        sp['d'] = md('\n'.join(desc))
        # class levels
        cls = {}
        for part in sp.get('lvl', '').split(','):
            mm = re.match(r'\s*(.+?)\s+(\d)\s*$', part)
            if mm:
                for c in mm.group(1).split('/'):
                    cls[c.strip()] = int(mm.group(2))
        sp['c'] = cls
        if 'lvl' not in sp and len(sp['d']) < 40: continue
        spells.append(sp)
print('spells', len(spells))

# ---------------- FEATS ----------------
feats = []
t = rd(os.path.join(B, 'feats.md'))
t = t[t.index('## Feat Descriptions'):]
for name, body in split_sections(t, 3):
    m = re.match(r'(.+?)\s*\[(.+?)\]', name)
    if not m: continue
    n, ty = m.group(1).strip(), m.group(2).strip()
    if n == 'Feat Name': continue
    pre = re.search(r'\*\*Prerequisites?:\*\*\s*(.+)', body)
    ben = re.search(r'\*\*Benefit:\*\*\s*(.+)', body)
    feats.append({'n': n, 't': ty, 'pre': clean(re.sub(r'[_*]', '', pre.group(1))) if pre else '',
                  'b': clean(re.sub(r'[_*]', '', ben.group(1)))[:220] if ben else '', 'd': md(body)})
print('feats', len(feats))

# ---------------- SKILLS ----------------
skills = []
t1 = rd(os.path.join(B, 'skills-i.md')); t1 = t1[t1.index('## Skill Descriptions'):]
secs = split_sections(t1, 3) + split_sections(rd(os.path.join(B, 'skills-ii.md')), 2)
for name, body in secs:
    m = re.match(r'(.+?)\s*\((.+?)\)\s*$', name)
    if not m or m.group(1) == 'Skill Name': continue
    n = m.group(1).strip(); parts = [p.strip() for p in m.group(2).split(';')]
    skills.append({'n': n, 'ab': parts[0], 'tr': 'Trained Only' in parts, 'acp': any('Armor Check' in p for p in parts),
                   'd': md(body)})
print('skills', len(skills), [s['n'] for s in skills])

# ---------------- CONDITIONS ----------------
conds = []
t = rd(os.path.join(B, 'special-abilities-and-conditions.md'))
t = t[t.index('## Conditions'):]
cur = None
for para in re.split(r'\n\s*\n', t):
    m = re.match(r'^\*\*_?([^*_:]+?)_?:\*\*\s*(.*)', para.strip(), re.S)
    if m:
        cur = {'n': m.group(1).strip(), 'd': md(para.strip())}
        conds.append(cur)
    elif cur and not para.strip().startswith('#'):
        cur['d'] += md(para)
print('conditions', len(conds), [c['n'] for c in conds])

# ---------------- RACES ----------------
races = []
t = rd(os.path.join(B, 'races.md'))
RN = {'Humans': 'Human', 'Dwarves': 'Dwarf', 'Elves': 'Elf', 'Gnomes': 'Gnome', 'Half-Elves': 'Half-Elf',
      'Half-Orcs': 'Half-Orc', 'Halflings': 'Halfling'}
for name, body in split_sections(t, 2):
    if name not in RN: continue
    adj = {}
    first = body.split('\n')[0]
    for mm in re.finditer(r'([+–-]\d)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)', '\n'.join(body.split('\n')[:3])):
        adj[mm.group(2)[:3]] = int(mm.group(1).replace('–', '-'))
    size = 'Small' if re.search(r'^- Small', body, re.M) else 'Medium'
    sp = re.search(r'base land speed is (\d+) feet', body)
    races.append({'n': RN[name], 'adj': adj, 'size': size, 'spd': int(sp.group(1)) if sp else 30, 'd': md(body)})
print('races', [(r['n'], r['adj'], r['size'], r['spd']) for r in races])

# ---------------- CLASSES ----------------
classes = []
t = rd(os.path.join(B, 'character-classes-i.md')) + '\n' + rd(os.path.join(B, 'character-classes-ii.md'))
CORE = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Wizard']
for name, body in split_sections(t, 2):
    if name not in CORE: continue
    hd = re.search(r'\*\*Hit Die:\*\*\s*d(\d+)', body)
    al = re.search(r'\*\*Alignment:\*\*\s*(.+)', body)
    spm = re.search(r'Each Additional Level:\*\*\s*(\d+)', body)
    cs_text = re.search(r'class skills \(and the key ability for each skill\) are (.+?)\.\s*$', body, re.M)
    cs = []
    if cs_text:
        s = cs_text.group(1)
        s = re.sub(r'\band\b', ',', s)
        for p in re.split(r',(?![^(]*\))', s):
            p = p.strip()
            m = re.match(r'(.+?)\s*\((\w+)\)$', p)
            if m: cs.append(m.group(1).strip())
            elif p: cs.append(p)
    # main table
    soup = BeautifulSoup(body, 'lxml')
    tables = []
    for tb in soup.find_all('table'):
        cap = tb.find('caption')
        rows = []
        for tr in tb.find_all('tr'):
            rows.append([strip_sup(c) for c in tr.find_all(['td', 'th'])])
        tables.append({'cap': txt(cap) if cap else '', 'rows': rows})
    main = next((x for x in tables if x['cap'].startswith('Table: The ')), None)
    prog = []
    if main:
        hdr = None
        for r in main['rows']:
            if r and r[0] == 'Level': hdr = r; continue
            if r and re.match(r'\d+(st|nd|rd|th)', r[0]):
                prog.append(r)
    # features: bold paragraphs inside Class Features
    feats_c = []
    cf = body.find('### Class Features')
    if cf >= 0:
        sub = body[cf:]
        nxt = re.search(r'^### (?!Class Features)', sub, re.M)
        for k, para in enumerate(re.split(r'\n\s*\n', sub)):
            m = re.match(r'^\*\*(.+?):\*\*', para.strip())
            if m:
                feats_c.append({'n': clean(m.group(1)), 'd': md(para)})
            elif feats_c and not para.strip().startswith('#') and not para.strip().startswith('<table'):
                if len(feats_c[-1]['d']) < 6000: feats_c[-1]['d'] += md(para)
    classes.append({'n': name, 'hd': int(hd.group(1)), 'al': clean(al.group(1)) if al else '', 'sp': int(spm.group(1)) if spm else 2,
                    'cs': cs, 'hdr': main['rows'][0] if main else [], 'prog': prog, 'f': feats_c,
                    'tables': [x for x in tables if x is not main and len(x['rows']) < 30]})
for c in classes: print(c['n'], c['hd'], c['sp'], len(c['cs']), len(c['prog']), c['prog'][0] if c['prog'] else None, len(c['f']))

# ---------------- EQUIPMENT ----------------
t = rd(os.path.join(B, 'equipment.md'))
# descriptions: bold-lead paragraphs
descs = {}
curk = None
for para in re.split(r'\n\s*\n', t):
    p = para.strip()
    m = re.match(r'^\*\*(.+?):\*\*', p)
    if m:
        curk = m.group(1).strip().lower(); descs[curk] = md(p)
    elif curk and p and not p.startswith('#') and not p.startswith('<'):
        if len(descs[curk]) < 3000: descs[curk] += md(p)
    elif p.startswith('#'): curk = None
def find_desc(n):
    k = n.lower()
    k2 = re.sub(r'\s*\(.*?\)', '', k).strip()
    for cand in [k, k2, k2.split(',')[0].strip()]:
        if cand in descs: return descs[cand]
    for dk in descs:
        if dk.startswith(k2) or k2.startswith(dk): return descs[dk]
    return ''
def wt(s):
    s = s.replace('lb.', '').replace('lbs.', '').strip()
    s = re.sub(r'\s+\d$', '', s)  # footnote
    m = re.match(r'^(\d+)\s*(?:-|–)?\s*1/2$', s)
    if s in ('1/2',): return 0.5
    if s in ('1/4',): return 0.25
    if s in ('1/10',): return 0.1
    if s in ('1/8',): return 0.125
    try: return float(s.replace(',', ''))
    except: return 0
weapons, armor, gear = [], [], []
for m in re.finditer(r'<table.*?</table>', t, re.S):
    soup = BeautifulSoup(m.group(0), 'lxml'); cap = soup.find('caption'); cap = txt(cap) if cap else ''
    rows = soup.find_all('tr')
    if cap == 'Table: Weapons':
        prof = sub = ''
        for r in rows:
            cells = r.find_all(['td', 'th'])
            if cells[0].name == 'th': prof = txt(cells[0]).replace(' Weapons', ''); continue
            if len(cells) == 1:
                tt = txt(cells[0])
                if len(tt) < 40: sub = tt
                continue
            v = [strip_sup(c) for c in cells]
            if len(v) < 8: continue
            n = v[0]
            weapons.append({'n': n, 'cat': prof, 'sub': sub, 'cost': v[1], 'dS': v[2], 'dM': v[3], 'crit': v[4],
                            'rng': v[5], 'w': wt(v[6]), 'ty': v[7], 'd': find_desc(n)})
    elif cap == 'Table: Armor and Shields':
        sub = ''
        for r in rows:
            v = [strip_sup(c) for c in r.find_all(['td', 'th'])]
            if not v or v[0] in ('', 'Armor'): continue
            if all(x == '' for x in v[1:]): sub = v[0]; continue
            if len(v) < 9: continue
            armor.append({'n': v[0], 'cat': sub, 'cost': v[1], 'ac': v[2], 'mdx': v[3], 'acp': v[4], 'asf': v[5],
                          's30': v[6], 's20': v[7], 'w': wt(v[8]), 'd': find_desc(v[0])})
    elif cap == 'Table: Goods and Services':
        sub = ''; minor = ''
        for r in rows:
            v = [strip_sup(c) for c in r.find_all(['td', 'th'])]
            if not v: continue
            if len(v) >= 2 and v[0] == 'Item': continue
            MAJOR = ('Adventuring Gear','Special Substances and Items','Tools and Skill Kits','Clothing','Food, Drink, and Lodging','Mounts and Related Gear','Transport','Spellcasting and Services')
            if len(v) <= 3 and (len(v) == 1 or all(x == '' for x in v[1:])):
                if v[0] in MAJOR: sub = v[0]; minor = ''
                else: minor = v[0]
                continue
            if len(v) >= 3 and sub not in ('Spellcasting and Services',):
                if v[1] == 'Cost': continue
                nm = (minor + ', ' + v[0].lower()) if minor else v[0]
                gear.append({'n': nm, 'cat': sub, 'cost': v[1], 'w': wt(v[2]) if len(v) > 2 else 0, 'd': find_desc(minor or v[0])})
print('weapons', len(weapons), 'armor', len(armor), 'gear', len(gear))
print(set(g['cat'] for g in gear))

# ---------------- MAGIC ITEMS ----------------
magic = []
MI = os.path.join(ROOT, 'magic-items')
def bold_entries(text, cat):
    out = []; cur = None
    for para in re.split(r'\n\s*\n', text):
        p = para.strip()
        if p.startswith('#'):
            cur = None; continue
        m = re.match(r'^\*\*(.+?):\*\*', p)
        if m:
            cur = {'n': clean(m.group(1)), 'cat': cat, 'd': md(p)}; out.append(cur)
        elif cur and p:
            cur['d'] += md(p) if not p.startswith('<table') else re.sub(r'\s*(class|data-debug)="[^"]*"','',p)
            pm = re.search(r'Price ([\d,]+ gp)', p)
            if pm and 'price' not in cur: cur['price'] = pm.group(1)
            wm = re.search(r'Weight ([\d/]+) lb', p)
            if wm: cur['w'] = wt(wm.group(1))
    return out
def section(text, start, stop=None):
    i = text.index(start); j = text.index(stop, i) if stop else len(text)
    return text[i + len(start):j]
t = rd(os.path.join(MI, 'magic-items-v-wondrous-items.md'))
magic += bold_entries(section(t, '## Wondrous Item Descriptions'), 'Wondrous Item')
t = rd(os.path.join(MI, 'magic-items-iii-potions-rings-and-rods.md'))
magic += [dict(e, n='Ring of ' + e['n']) for e in bold_entries(section(t, '## Ring Descriptions', '## Rods'), 'Ring')]
magic += [dict(e, n='Rod of ' + e['n'] if not e['n'].lower().startswith('rod') else e['n']) for e in bold_entries(section(t, '## Rod Descriptions'), 'Rod')]
t = rd(os.path.join(MI, 'magic-items-iv-scrolls-staffs-and-wands.md'))
if '## Staff Descriptions' in t:
    magic += [dict(e, n='Staff of ' + e['n'] if not e['n'].lower().startswith('staff') else e['n']) for e in bold_entries(section(t, '## Staff Descriptions', '## Wands' if '## Wands' in t else None), 'Staff')]
t = rd(os.path.join(MI, 'magic-items-ii-armor-and-weapons.md'))
magic += bold_entries(section(t, '## Specific Armors', '## Weapons'), 'Specific Armor/Shield')
magic += bold_entries(section(t, '## Specific Weapons'), 'Specific Weapon')
magic += [dict(e, n='(Armor ability) ' + e['n']) for e in bold_entries(section(t, '## Magic Armor and Shield Special Ability Descriptions', '## Specific Armors'), 'Armor Special Ability')]
magic += [dict(e, n='(Weapon ability) ' + e['n']) for e in bold_entries(section(t, '## Magic Weapon Special Ability Descriptions', '## Specific Weapons'), 'Weapon Special Ability')]
magic = [m for m in magic if len(m['n']) < 60]
print('magic', len(magic), {c: sum(1 for m in magic if m['cat'] == c) for c in set(m['cat'] for m in magic)})

data = {'spells': spells, 'feats': feats, 'skills': skills, 'conditions': conds, 'races': races, 'classes': classes,
        'weapons': weapons, 'armor': armor, 'gear': gear, 'magic': magic}
s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))

# ---------------- CLEAN-UPS ----------------
fixn = {'Knowledge (nobility , royalty)': 'Knowledge (nobility and royalty)', 'Speak Language (n/a)': 'Speak Language'}
for c in data['classes']:
    c['cs'] = [fixn.get(x, 'Spellcraft' if x.startswith('Spellcraft') else x) for x in c['cs']]
    c['cs'] = ['Knowledge (all)' if x.startswith('Knowledge (all') else x for x in c['cs']]
    c['f'] = [dict(f, n=re.sub(r'_', '', f['n'])) for f in c['f']]
    sk = [t for t in c['tables'] if 'Spells Known' in t['cap']]
    c['known'] = [r for r in sk[0]['rows'] if r and re.match(r'\d+(st|nd|rd|th)$', r[0])] if sk else []
    del c['tables']
out = os.path.join(HERE, '..', 'data', 'srd.json')

open(out, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('wrote', out)

# ---------------- RULES CHAPTERS (for the Rules Lookup tab) ----------------
# (chapter title, file, start marker or None, stop marker or None)
CHAPTERS = [
    ('Basics & Ability Scores', 'basic-rules-and-legal/basics-and-ability-scores.md', None, None),
    ('Races', 'basic-rules-and-legal/races.md', None, None),
    ('Classes I', 'basic-rules-and-legal/character-classes-i.md', None, None),
    ('Classes II', 'basic-rules-and-legal/character-classes-ii.md', None, None),
    ('Skills (Using Skills)', 'basic-rules-and-legal/skills-i.md', None, '## Skill Descriptions'),
    ('Feats (Rules)', 'basic-rules-and-legal/feats.md', None, '## Feat Descriptions'),
    ('Equipment', 'basic-rules-and-legal/equipment.md', None, None),
    ('Special Materials', 'basic-rules-and-legal/special-materials.md', None, None),
    ('Combat I: Basics', 'basic-rules-and-legal/combat-i-basics.md', None, None),
    ('Combat II: Movement, Modifiers & Special Actions', 'basic-rules-and-legal/combat-ii-movement-modifiers-and-special-actions.md', None, None),
    ('Special Abilities & Conditions', 'basic-rules-and-legal/special-abilities-and-conditions.md', None, None),
    ('Magic Overview', 'spells/magic-overview.md', None, None),
    ('Spell Lists I', 'spells/spell-list-i.md', None, None),
    ('Spell Lists II', 'spells/spell-list-ii.md', None, None),
    ('Carrying, Movement & Exploration', 'basic-rules-and-legal/carrying-movement-and-exploration.md', None, None),
    ('Alignment & Description', 'basic-rules-and-legal/alignment-and-description.md', None, None),
    ('Magic Items: Basics & Creation', 'magic-items/magic-items-i-basics-and-creation.md', None, None),
    ('Treasure', 'basic-rules-and-legal/treasure.md', None, None),
    ('Prestige Classes', 'basic-rules-and-legal/prestige-classes.md', None, None),
    ('NPC Classes', 'basic-rules-and-legal/npc-classes.md', None, None),
    ('Types, Subtypes & Special Abilities', 'basic-rules-and-legal/types-subtypes-and-special-abilities.md', None, None),
    ('Wilderness, Weather & Environment', 'basic-rules-and-legal/wilderness-weather-and-environment.md', None, None),
    ('Traps', 'basic-rules-and-legal/traps.md', None, None),
    ('Planes', 'basic-rules-and-legal/planes.md', None, None),
]
def html_block(t):
    # markdown with raw HTML tables kept as-is (minus styling attributes)
    h = markdown.markdown(t.strip(), extensions=['tables'])
    return re.sub(r'\s*(class|data-debug)="[^"]*"', '', h)
rules = []
for ci, (title, rel, start, stop) in enumerate(CHAPTERS):
    t = rd(os.path.join(ROOT, rel))
    if start: t = t[t.index(start):]
    if stop and stop in t: t = t[:t.index(stop)]
    t = re.sub(r'^This material is Open Game Content.*$', '', t, flags=re.M)
    parts = re.split(r'^(#{1,4}) (.+)$', t, flags=re.M)
    intro = parts[0].strip()
    secs = []
    for i in range(1, len(parts), 3):
        secs.append((len(parts[i]), clean(re.sub(r'<[^>]+>', '', parts[i + 1])), parts[i + 2]))
    if secs and secs[0][0] == 1:  # chapter H1 -> chapter intro
        intro = (intro + '\n\n' + secs[0][2]).strip(); secs = secs[1:]
    if intro: rules.append({'c': ci, 'l': 1, 'h': title, 'd': html_block(intro)})
    for lv, h, body in secs:
        h = re.sub(r'[_*]', '', h).strip()
        if not h: continue
        rules.append({'c': ci, 'l': lv, 'h': h, 'd': html_block(body)})
data['chapters'] = [c[0] for c in CHAPTERS]
data['rules'] = rules
print('rules sections', len(rules))

open(out, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('wrote', out, os.path.getsize(out))

# ---------------- POTIONS, OILS & WANDS (from the SRD price tables) ----------------
spell_by = {s['n'].lower().replace('’', "'"): s for s in data['spells']}
def find_spell(n):
    k = n.lower().replace('’', "'").replace('(alignment)', 'evil').strip()
    if k in spell_by: return spell_by[k]
    m = re.match(r'^(lesser|greater|mass) (.+)$', k)
    if m and f"{m.group(2)}, {m.group(1)}" in spell_by: return spell_by[f"{m.group(2)}, {m.group(1)}"]
    k2 = re.sub(r'\s*\(.*?\)', '', k); k2 = re.sub(r'\s+[\d/]+\w*(/magic)?$', '', k2).strip()
    if k2 in spell_by: return spell_by[k2]
    for sk, sv in spell_by.items():
        if sk.startswith(k2 + ' ') or sk.startswith(k2 + ','): return sv
    return None
consumables = []
def price_gp(p): return num_f(re.sub(r'[^\d.]', '', p.split('gp')[0]))
def num_f(x):
    try: return float(x)
    except: return 0
for rel, cap, kind in [('magic-items/magic-items-iii-potions-rings-and-rods.md', 'Table: Potions and Oils', 'potion'),
                       ('magic-items/magic-items-iv-scrolls-staffs-and-wands.md', 'Table: Wands', 'wand')]:
    t = rd(os.path.join(ROOT, rel))
    for m in re.finditer(r'<table.*?</table>', t, re.S):
        soup = BeautifulSoup(m.group(0), 'lxml'); c = soup.find('caption')
        if not c or txt(c) != cap: continue
        for tr in soup.find_all('tr')[1:]:
            cells = [strip_sup(x) for x in tr.find_all(['td', 'th'])]
            if len(cells) < 5: continue
            name, price = cells[3], cells[4]
            k = kind
            mm = re.match(r'^(.+?)\s*\((potion|oil)\)$', name)
            if mm: name, k = mm.group(1), mm.group(2)
            plus = ''
            pm = re.search(r'\s+(\+\d)$', name)
            if pm: plus = pm.group(1); name = name[:pm.start()]
            name = re.sub(r'\s+\d$', '', name).strip()
            name = re.sub(r'\s*\(potion or oil\)', '', name)
            fixed_cl = None; note = ''
            cm = re.search(r'\s*\((\d+)(st|nd|rd|th)\)$', name)
            if cm: fixed_cl = int(cm.group(1)); name = name[:cm.start()]
            hm = re.search(r',\s*heightened \((\d+)\w*[- ]level(?: spell)?\)$', name)
            if hm: hl = int(hm.group(1)); fixed_cl = 2 * hl - 1; note = f"heightened to {hl}{'st' if hl == 1 else 'nd' if hl == 2 else 'rd' if hl == 3 else 'th'} level"; name = name[:hm.start()]
            sp = find_spell(name)
            lvl = min(sp['c'].values()) if sp and sp['c'] else 1
            gp = price_gp(price); base = (750 if kind == 'wand' else 50)
            cl = fixed_cl or (max(1, round(gp / (base * (lvl or 0.5)))) if gp else 1)
            exact = sp and sp['n'].lower().replace('’', "'") == name.lower().replace('’', "'")
            title = sp['n'] if exact else name[:1].upper() + name[1:]
            if not exact and sp and re.match(r'^(lesser|greater|mass) ', name.lower()): title = sp['n']
            label = {'potion': 'Potion of ', 'oil': 'Oil of ', 'wand': 'Wand of '}[k] + title + (f' {plus}' if plus else '') + (f' (CL {fixed_cl})' if cm else '') + (f' ({note})' if note else '')
            consumables.append({'n': label, 'k': k, 'sp': sp['n'] if sp else title, 'cl': cl, 'price': price, 'plus': plus, 'lvl': lvl,
                                'w': 0.1 if k != 'wand' else 0, 'charges': 50 if k == 'wand' else 0, 'note': note})
data['consumables'] = consumables
print('consumables', len(consumables), [c['n'] for c in consumables[:5]], [c['n'] for c in consumables if not find_spell(c['sp'])])

open(out, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))

# ---------------- ANIMALS (stat blocks) & COMPANION / FAMILIAR / MOUNT TABLES ----------------
def stat_tables(md_text):
    """Yield (heading, {name, fields...}) for every monster stat-block table (handles side-by-side columns)."""
    out = []
    heads = [(m.start(), clean(m.group(2))) for m in re.finditer(r'^(#{2,4}) (.+)$', md_text, re.M)]
    for m in re.finditer(r'<table.*?</table>', md_text, re.S):
        if 'Hit Dice:' not in m.group(0): continue
        h = [x for x in heads if x[0] < m.start()]; heading = h[-1][1] if h else ''
        soup = BeautifulSoup(m.group(0), 'lxml'); rows = soup.find_all('tr')
        pre, body = [], []
        for tr in rows:
            th = tr.find('th')
            if th and txt(th).endswith(':'): body.append(tr)
            elif not body: pre.append([strip_sup(x) for x in tr.find_all(['td', 'th'])][1:])
        ncol = max((len(tr.find_all('td')) for tr in body), default=1)
        names = [heading] * ncol; types = [''] * ncol
        if len(pre) >= 2: names = (pre[0] + [heading] * ncol)[:ncol]; types = (pre[1] + [''] * ncol)[:ncol]
        elif len(pre) == 1: types = (pre[0] + [''] * ncol)[:ncol]
        for ci in range(ncol):
            blk = {'n': names[ci] or heading, 'type': types[ci]}
            for tr in body:
                k = txt(tr.find('th')).rstrip(':'); tds = tr.find_all('td')
                if ci < len(tds): blk[k] = strip_sup(tds[ci])
            out.append((heading, blk))
    return out
def section_text(md_text, heading):
    m = re.search(r'^#{2,4} ' + re.escape(heading) + r'\s*$', md_text, re.M)
    if not m: return ''
    rest = md_text[m.end():]; nx = re.search(r'^#{2,4} ', rest, re.M); body = rest[:nx.start()] if nx else rest
    body = re.sub(r'<table.*?</table>', '', body, flags=re.S)
    return html_block(body)[:4000]
animals = []
for rel in ['monsters/monsters-animals.md', 'monsters/monsters-di-do.md']:
    t = rd(os.path.join(ROOT, rel))
    for heading, blk in stat_tables(t):
        if rel.endswith('di-do.md') and not re.search(r'Animal|Dinosaur|Dire', blk.get('type', '') + heading): continue
        if 'Animal' not in blk.get('type', '') and 'dire' not in blk['n'].lower() and 'Dinosaur' not in t[:0] + heading and heading not in ('Deinonychus', 'Elasmosaurus', 'Megaraptor', 'Triceratops', 'Tyrannosaurus'): continue
        blk['d'] = section_text(t, heading)
        animals.append(blk)
seen = set(); uniq = []
for a in animals:
    if a['n'] in seen: continue
    seen.add(a['n']); uniq.append(a)
data['animals'] = uniq
print('animals', len(uniq), [a['n'] for a in uniq])

def table_after(text, marker):
    i = text.find(marker); m = re.search(r'<table.*?</table>', text[i:], re.S) if i >= 0 else None
    if not m: return []
    soup = BeautifulSoup(m.group(0), 'lxml')
    return [[strip_sup(c) for c in tr.find_all(['td', 'th'])] for tr in soup.find_all('tr')]
def italic_defs(text, start, stop):
    i = text.find(start); j = text.find(stop, i + 1) if stop else -1; seg = text[i: j if j > 0 else None]
    out = {}
    for m in re.finditer(r'^_([^_]+?)(?: \((Ex|Su|Sp)\))?:_\s*(.+)$', seg, re.M):
        out[m.group(1).strip()] = clean(m.group(3))
    return out
c1 = rd(os.path.join(ROOT, 'basic-rules-and-legal/character-classes-i.md'))
c2 = rd(os.path.join(ROOT, 'basic-rules-and-legal/character-classes-ii.md'))
alt = {}
seg = c1[c1.find('### Alternative Animal Companions'):c1.find('## Fighter')]
for m in re.finditer(r'^#### (\d+)\w+ Level or Higher \(Level –(\d+)\)\s*\n(.*?)(?=^#### |\Z)', seg, re.M | re.S):
    for line in m.group(3).splitlines():
        line = re.sub(r'<sup>.*?</sup>', '', line).strip()
        if line and not line.startswith('<') and not line.startswith('1 '):
            alt[re.sub(r'\s*\((animal|dinosaur)\)\s*$', '', line).strip()] = int(m.group(2))
base_line = re.search(r'Animal Companion \(Ex\):\*\* A druid may begin play with an animal companion selected from the following list: (.+?)\. If the campaign', c1).group(1)
data['companionRules'] = {
  'base': base_line, 'aquatic': 'crocodile, porpoise, Medium shark, squid', 'alt': alt,
  'table': table_after(c1, '### The Druid’s Animal Companion'),
  'defs': italic_defs(c1, '**Animal Companion Basics:**', '### Alternative Animal Companions'),
  'familiars': table_after(c2, '### Familiars'),
  'famTable': table_after(c2, '**Familiar Ability Descriptions:**'),
  'famDefs': italic_defs(c2, '**Familiar Ability Descriptions:**', '## '),
  'famBasics': html_block(c2[c2.find('**Familiar Basics:**'):c2.find('**Familiar Ability Descriptions:**')]),
  'mountTable': table_after(c2, '### The Paladin’s Mount'),
  'mountDefs': (lambda d: {k: v for k, v in d.items() if k in ('Bonus HD', 'Natural Armor Adj.', 'Str Adj.', 'Int', 'Empathic Link', 'Improved Evasion', 'Share Spells', 'Share Saving Throws', 'Improved Speed', 'Command', 'Spell Resistance')})(italic_defs(c2, '**Paladin’s Mount Basics:**', '### Code of Conduct')),
}
cr = data['companionRules']
print('alt', len(alt), 'table', len(cr['table']), 'fam', len(cr['familiars']), 'famTable', len(cr['famTable']), 'mount', len(cr['mountTable']), 'defs', list(cr['defs'])[:12], list(cr['famDefs'])[:12], list(cr['mountDefs'])[:12])

# ---------------- PRESTIGE CLASSES ----------------
pt = rd(os.path.join(B, 'prestige-classes.md'))
prestige = []
for name, body in split_sections(pt, 2):
    if name.startswith('Definitions'): continue
    hd = re.search(r'\*\*Hit Die:\*\*\s*d(\d+)', body)
    req_s = body[body.find('### Requirements'):body.find('### Class Skills')]
    req = [[clean(m.group(1)), clean(re.sub(r'[_*]', '', m.group(2))).rstrip('.')] for m in re.finditer(r'^\*\*(.+?):\*\*\s*(.+)$', req_s, re.M)]
    spm = re.search(r'Skill Points at Each Level:\*\*\s*(\d+)', body)
    cs_text = re.search(r'class skills \(and the key ability for each skill\) are (.+?)\.\s*$', body, re.M)
    cs = []
    if cs_text:
        s2 = re.sub(r'\band\b', ',', cs_text.group(1).replace('.', ','))
        for q in re.split(r',(?![^(]*\))', s2):
            q = q.strip(); m = re.match(r'(.+?)\s*\((Str|Dex|Con|Int|Wis|Cha|None)\)$', q)
            q = m.group(1).strip() if m else q
            if q: cs.append(q)
    soup = BeautifulSoup(body, 'lxml'); main = None
    for tb in soup.find_all('table'):
        cap = tb.find('caption')
        first = tb.find(['th', 'td'])
        if (cap and txt(cap).startswith('Table: The ')) or (not cap and first and re.match(r'Table ?: The ', txt(first))): main = tb; break
    hdr, prog = [], []
    if main:
        for tr in main.find_all('tr'):
            r = [strip_sup(c) for c in tr.find_all(['td', 'th'])]
            if r and r[0] == 'Level': hdr = r; continue
            if r and re.match(r'\d+(st|nd|rd|th)', r[0]): prog.append(r)
    feats_c = []
    cf = body.find('### Class Features')
    if cf >= 0:
        sub = body[cf:]
        for para in re.split(r'\n\s*\n', sub):
            m = re.match(r'^\*\*(.+?):\*\*', para.strip())
            if m: feats_c.append({'n': clean(re.sub(r'[_*]', '', m.group(1))), 'd': md(para)})
            elif feats_c and not para.strip().startswith('#') and not para.strip().startswith('<table') and len(feats_c[-1]['d']) < 6000: feats_c[-1]['d'] += md(para)
    # other sections (spell lists, fiendish servant…) for the rules page
    extra = ''
    for t2, b2 in split_sections(body, 3):
        if t2 in ('Requirements', 'Class Skills', 'Class Features'): continue
        extra += '<h4>' + t2 + '</h4>' + md(b2)
    al = next((r[1] for r in req if r[0] == 'Alignment'), 'Any')
    prestige.append({'n': name, 'hd': int(hd.group(1)) if hd else 8, 'al': al, 'sp': int(spm.group(1)) if spm else 2, 'cs': cs, 'hdr': hdr, 'prog': prog, 'f': feats_c,
                     'req': req, 'prestige': True, 'extra': extra, 'tables': []})
for c in prestige: print('PrC', c['n'], c['hd'], c['sp'], len(c['cs']), len(c['prog']), c['hdr'], [r[0] for r in c['req']], len(c['f']))
data['classes'] = [c for c in data['classes'] if not c.get('prestige')] + prestige

open(out, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
