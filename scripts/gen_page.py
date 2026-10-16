"""用同一个模板生成中文版和日文版页面，保证两版结构、标记、计算完全一致。"""
import json, os, sys
base = sys.argv[1]

T = {
"zh": {
 "lang": "zh-CN",
 "title": "新潟数据切片",
 "take": '日本国产原油有 <b class="dash-skeleton" data-source="c_energy" data-field="value" data-where="key=oil_share">—</b> 产自新潟；全日本每人一年吃的米里，有 <b class="dash-skeleton" data-source="c_rice" data-field="value" data-where="key=kg_japanese">—</b> 公斤出自这里；神社密度是全国的 <b class="dash-skeleton" data-source="c_density" data-field="value" data-where="key=shrine_x">—</b> 倍。2025 年外国游客住宿暴涨 <b class="dash-skeleton" data-source="tourism" data-field="foreign_yoy_pct" data-where="code=niigata">—</b>，增速全国 <b class="dash-skeleton" data-source="c_pref_sum" data-field="value" data-where="key=growth_rank">—</b>，可在新潟的住宿里仍只占 <b class="dash-skeleton" data-source="c_tour" data-field="value" data-where="key=fshare_niigata">—</b>。',
 "meta": "全部数字来自官方统计；占比、人均和倍数由页面从原始数字现算，点任意数字可在「来源」里看到出处与公式。",
 "nav": ["能源", "大米", "入境观光", "密度", "意外的日本第一", "全部清单"],
 "k1": "01 · 能源", "h1": "日本本土那一点点石油和天然气，大部分在新潟",
 "l1": "日本几乎全靠进口能源，但本土还有少量油气田，主力就在新潟。拿它的产量占比和人口占比比一比，差距是几十倍。",
 "c1t": "新潟占全国的比例，2024", "c1n": "原油、天然气为国内产量占比；人口为 2025 年国势调查占比，作为参照。",
 "c1bt": "产量占比是人口占比的多少倍", "c1bn": "“新潟贡献的份额”除以“新潟人口的份额”。",
 "oil": "原油", "gas": "天然气", "pop": "人口",
 "c1sub": '2024 年县内 <b data-source="energy" data-field="fields" data-where="code=oil">—</b> 处油田产原油 <b data-source="energy" data-field="niigata" data-where="code=oil">—</b> kL，全国合计 <b data-source="energy" data-field="japan" data-where="code=oil">—</b> kL。',
 "k2": "02 · 大米", "h2": "大米产量第一，而且是断层式领先",
 "l2": "新潟的主食用米产量稳居第一，比第二名北海道多出一个中等县的产量。换算成人头，这个数字更直观。",
 "t2a": "占全国产量", "t2as": "2025 年主食用米", "t2b": "领先第二名北海道", "t2bs": "吨",
 "t2c": "每个新潟县民摊到", "t2cs": "公斤 / 人 · 年", "t2d": "给全日本每人分", "t2ds": "公斤 / 人 · 年",
 "c2t": "水稻收获量前 13 名（令和7年产）", "c2n": "主食用米，生产者筛目基准，单位：万吨。",
 "rice_tip_unit": " 吨 · 第 ", "rice_tip_rank": " 名",
 "k3": "03 · 入境观光", "h3": "外国游客暴涨，但新潟仍是入境的“洼地”",
 "l3": "增速惊人，基数却很小：外国人在新潟住宿中的占比远低于全国，按人口算的外国游客密度也只有全国的几分之一。同年日本人住宿还在下滑。",
 "t3a": "外国人住宿人夜（2025）", "t3as1": "比上年", "t3as2": "全国",
 "t3b": "外国人占全部住宿", "t3bs": "全国",
 "t3c": "每位居民对应的外国人住宿", "t3cs1": "全国", "t3cs2": "差", "t3cs3": "倍",
 "t3d": "日本人住宿变化", "t3ds": "由总数、外国人数及各自增减率反推",
 "c3t": "2025 年新潟住宿人夜的增减构成",
 "c3n": '外国人的增量只抵消了日本人减量的 <b data-source="c_tour" data-field="value" data-where="key=offset_pct">—</b>。',
 "jp": "日本人", "fr": "外国人", "tot": "合计", "nights": " 人夜",
 "c3bt": "外国人占住宿比例", "c3bn": "新潟 vs 全国，2025 年确定值。", "lbl_jp": "全国", "lbl_ni": "新潟",
 "k4": "04 · 密度", "h4": "神社、天鹅和米果：按人头算才显出的“新潟浓度”",
 "l4": "绝对数排第一不稀奇，新潟面积大；换成人均或全国占比，才看出它在这些东西上浓得不寻常。",
 "t4a": "每万人神社数",
 "t4as": '全国 <b data-source="c_density" data-field="value" data-where="key=shrine_10k_japan">—</b>，是全国的 <b data-source="c_density" data-field="value" data-where="key=shrine_x">—</b> 倍；神社总数 <b data-source="density" data-field="value" data-where="key=shrines_niigata">—</b>，全国第一',
 "t4b": "全日本越冬天鹅中，在新潟的",
 "t4bs": '2022 年 1 月调查；2025 年县内仍有 <b data-source="density" data-field="value" data-where="key=swans_niigata_2025">—</b> 只',
 "t4c": "米果出货额，摊到每个县民", "t4cs": "日元 / 人 · 年；米果出货额全国第一",
 "k5": "05 · 意外的日本第一", "h5": "雪国、锦鲤和牙齿：没想到也是第一",
 "l5": "大米和清酒是意料之中，下面这些才有意思。数字均为县统计课公布的全国第一项目。",
 "f": [("kerosene", "雪国的刚需，暖炉产业也就扎根在这里。"),
       ("koi", "锦鲤起源于新潟山古志一带。"),
       ("cavities", "12 岁孩子人均龋齿数全国最少。"),
       ("cutlery", "燕市一带的金属加工，撑起了国产西餐具。"),
       ("mochi", "米多，年糕自然也多。"),
       ("shinkansen", "上越新干线 + 北陆新干线，县内车站数全国最多。")],
 "k6": "06 · 清单", "h6": "新潟拿下的全部日本第一",
 "l6": "县统计课 2026 年 4 月版「全国ベスト5」中排名第一的项目。",
 "c6t": "日本第一项目一览", "c6n1": "共", "c6n2": "项。可搜索，点表头排序。",
 "search": "搜索项目或领域…", "th": ["项目", "领域", "数值", "单位", "时点"],
 "foot": "口径说明：原油有两套官方数字——县产业振兴课的能源页（用于算全国占比）与经产省生产动态统计（清单里引用）口径不同，后者较低。全国神社总数为令和元年版，与新潟 2024 年数字年份不一致，人均比较为近似。天鹅占比用的是 2022 年全国调查。人口只用作计算人均的分母。",
"p_h": "跟其他 46 个都道府县比一比", 
 "p_l": "单看外国人占住宿的比例，新潟只排在中下游；真正罕见的是增速——全国几乎没有哪个地方涨得比它快。比例低、增速高，说明它正处在“刚被发现”的阶段。",
 "p_t1": "外国人占比的全国排名", "p_t1s": '47 个都道府县中；中位数 <b data-source="c_pref_sum" data-field="value" data-where="key=median_share">—</b>',
 "p_t2": "外国人住宿增速的全国排名", "p_t2s": "2025 年比上年，47 个都道府县中",
 "p_t3": "平均每几个住宿人夜里有 1 个外国人", "p_t3s": '全国平均每 <b data-source="c_pref_sum" data-field="value" data-where="key=one_in_japan">—</b> 个就有 1 个',
 "p_t4": "总住宿人夜的全国排名", "p_t4s": '但外国人住宿只排 <b data-source="c_pref_sum" data-field="value" data-where="key=foreign_rank">—</b>',
 "p_c1t": "外国人住宿增速前 5 名（2025）", "p_c1n": "47 个都道府县中涨得最快的五个，以及全国平均。悬停可看各县外国人占比。",
 "cp_t": "47都道府县外国人占比与增速", "cp_d": "各都道府县外国人住宿占全部住宿的比例、外国人住宿同比增速，以及各项排名。",
 "cs_t": "新潟在47都道府县中的位置", "cs_d": "新潟的占比排名、增速排名、总量排名、外国人住宿排名，全国中位数，以及几个住宿人夜中有1个外国人。",
 "ax_x": "外国人占住宿比例 →", "ax_y": "↑ 外国人住宿增速", "median": "中位数", "natg": "全国增速", "share_l": "占比", "growth_l": "增速", "rank_pre": "第 ", "rank_post": " 位",
 "ce_t": "油气占比 vs 人口占比", "ce_d": "新潟原油、天然气产量占全国比例，及其相对人口占比的倍数。",
 "cr_t": "大米占比与人均", "cr_d": "新潟主食用米占全国比例、领先北海道的量、按县民与全国人口摊算的公斤数。",
 "ct_t": "入境住宿结构", "ct_d": "外国人占住宿比例、每位居民对应的外国人住宿，以及由增减率反推的上年值与日本人住宿变化。",
 "cd_t": "神社、天鹅、米果的密度", "cd_d": "每万人神社数（新潟 vs 全国）、新潟天鹅占全国比例、米果出货额按县民摊算。",
 "x": " 倍", "kg": "",
},
"ja": {
 "lang": "ja",
 "title": "新潟データスライス",
 "take": '国内で採れる原油の <b class="dash-skeleton" data-source="c_energy" data-field="value" data-where="key=oil_share">—</b> は新潟産。日本人1人あたり年 <b class="dash-skeleton" data-source="c_rice" data-field="value" data-where="key=kg_japanese">—</b> kg のお米が新潟から。神社の密度は全国の <b class="dash-skeleton" data-source="c_density" data-field="value" data-where="key=shrine_x">—</b> 倍。2025年の外国人宿泊は <b class="dash-skeleton" data-source="tourism" data-field="foreign_yoy_pct" data-where="code=niigata">—</b> 伸びて全国 <b class="dash-skeleton" data-source="c_pref_sum" data-field="value" data-where="key=growth_rank">—</b> だが、県内宿泊に占める割合はまだ <b class="dash-skeleton" data-source="c_tour" data-field="value" data-where="key=fshare_niigata">—</b>。',
 "meta": "数値はすべて公的統計から。シェア・1人あたり・倍率はページが元の数値からその場で計算しています。数字をクリックすると「Sources」で出典と計算式を確認できます。",
 "nav": ["エネルギー", "お米", "インバウンド", "密度", "意外な日本一", "日本一リスト"],
 "k1": "01 · エネルギー", "h1": "わずかな国産原油・天然ガス、その大半は新潟から",
 "l1": "日本のエネルギーはほぼ輸入頼みですが、国内にも小さな油田・ガス田があり、その中心が新潟です。生産シェアを人口シェアと比べると、差は数十倍になります。",
 "c1t": "新潟の全国シェア（2024年）", "c1n": "原油・天然ガスは国内生産量に占める割合。人口は2025年国勢調査のシェアで、比較用です。",
 "c1bt": "生産シェアは人口シェアの何倍か", "c1bn": "「新潟の生産シェア」÷「新潟の人口シェア」。",
 "oil": "原油", "gas": "天然ガス", "pop": "人口",
 "c1sub": '2024年、県内 <b data-source="energy" data-field="fields" data-where="code=oil">—</b> か所の油田で原油 <b data-source="energy" data-field="niigata" data-where="code=oil">—</b> kL を生産（全国計 <b data-source="energy" data-field="japan" data-where="code=oil">—</b> kL）。',
 "k2": "02 · お米", "h2": "収穫量は日本一、しかも2位を大きく引き離す",
 "l2": "主食用米の収穫量は不動の1位で、2位の北海道との差は中規模の県1つ分。1人あたりに直すと、規模の大きさがよく分かります。",
 "t2a": "全国シェア", "t2as": "2025年産・主食用米", "t2b": "2位・北海道との差", "t2bs": "トン",
 "t2c": "新潟県民1人あたり", "t2cs": "kg / 人・年", "t2d": "日本人全員で分けると", "t2ds": "kg / 人・年",
 "c2t": "水稲収穫量 上位13道県（令和7年産）", "c2n": "主食用・生産者ふるい目ベース、単位：万トン。",
 "rice_tip_unit": " トン · ", "rice_tip_rank": " 位",
 "k3": "03 · インバウンド", "h3": "外国人客は急増、それでも新潟はインバウンドの「谷間」",
 "l3": "伸び率は驚くほど高い一方で、母数はまだ小さいまま。宿泊に占める外国人の割合は全国を大きく下回り、人口あたりの外国人宿泊も全国の数分の一です。同じ年、日本人の宿泊は減っていました。",
 "t3a": "外国人延べ宿泊者数（2025年）", "t3as1": "前年比", "t3as2": "全国",
 "t3b": "宿泊全体に占める外国人の割合", "t3bs": "全国",
 "t3c": "住民1人あたりの外国人宿泊", "t3cs1": "全国", "t3cs2": "差は", "t3cs3": "倍",
 "t3d": "日本人宿泊の増減", "t3ds": "総数・外国人数とそれぞれの前年比から逆算",
 "c3t": "2025年 新潟の延べ宿泊者数 増減の内訳",
 "c3n": '外国人の増加分で埋まったのは、日本人の減少分の <b data-source="c_tour" data-field="value" data-where="key=offset_pct">—</b> だけ。',
 "jp": "日本人", "fr": "外国人", "tot": "合計", "nights": " 人泊",
 "c3bt": "宿泊に占める外国人の割合", "c3bn": "新潟と全国、2025年確定値。", "lbl_jp": "全国", "lbl_ni": "新潟",
 "k4": "04 · 密度", "h4": "神社・白鳥・米菓――人口あたりで見える「新潟の濃さ」",
 "l4": "新潟は面積が広いので、実数で1位なのは珍しくありません。1人あたりや全国シェアに直すと、その濃さが際立ちます。",
 "t4a": "人口1万人あたりの神社数",
 "t4as": '全国 <b data-source="c_density" data-field="value" data-where="key=shrine_10k_japan">—</b>、全国の <b data-source="c_density" data-field="value" data-where="key=shrine_x">—</b> 倍。神社数 <b data-source="density" data-field="value" data-where="key=shrines_niigata">—</b> は全国1位',
 "t4b": "日本で越冬するハクチョウのうち新潟にいる割合",
 "t4bs": '2022年1月の調査。2025年も県内に <b data-source="density" data-field="value" data-where="key=swans_niigata_2025">—</b> 羽',
 "t4c": "米菓の出荷額、県民1人あたり", "t4cs": "円 / 人・年。米菓の出荷額は全国1位",
 "k5": "05 · 意外な日本一", "h5": "雪国、錦鯉、そして歯――これも日本一",
 "l5": "お米やお酒は予想どおり。面白いのはこちらです。いずれも県統計課が公表している全国1位の項目です。",
 "f": [("kerosene", "雪国ならではの必需品。ストーブ産業もここに根づきました。"),
       ("koi", "錦鯉は新潟・旧山古志村周辺が発祥の地。"),
       ("cavities", "12歳児1人あたりのむし歯の本数が全国で最も少ない。"),
       ("cutlery", "燕市の金属加工が、国産洋食器を支えています。"),
       ("mochi", "米どころは、餅どころでもあります。"),
       ("shinkansen", "上越新幹線と北陸新幹線で、県内の駅数は全国最多。")],
 "k6": "06 · リスト", "h6": "新潟の日本一、全項目",
 "l6": "県統計課「全国ベスト5」2026年4月版で1位の項目です。",
 "c6t": "日本一の項目一覧", "c6n1": "全", "c6n2": "項目。検索・見出しクリックで並べ替えできます。",
 "search": "項目や分野で検索…", "th": ["項目", "分野", "数値", "単位", "時点"],
 "foot": "注：原油生産量には公的な数字が2種類あります。全国シェアの計算には県産業振興課のエネルギーページの値を、一覧には経済産業省「生産動態統計」の値（こちらの方が小さい）を使っています。全国の神社数は令和元年版のため、新潟の2024年値とは年がずれており、1人あたりの比較は概算です。ハクチョウのシェアは2022年の全国調査によります。人口は1人あたりの計算の分母としてのみ使っています。",
"p_h": "ほかの46都道府県と比べると",
 "p_l": "宿泊に占める外国人の割合だけを見ると、新潟は中位より下。目立つのは伸び率で、全国でもこれ以上伸びた県はほとんどありません。割合は低く伸びは急――まさに「見つかり始めた」段階です。",
 "p_t1": "外国人割合の全国順位", "p_t1s": '47都道府県中。中央値は <b data-source="c_pref_sum" data-field="value" data-where="key=median_share">—</b>',
 "p_t2": "外国人宿泊の伸び率 全国順位", "p_t2s": "2025年の前年比、47都道府県中",
 "p_t3": "延べ宿泊者何人泊につき外国人1人泊か", "p_t3s": '全国平均は <b data-source="c_pref_sum" data-field="value" data-where="key=one_in_japan">—</b> 人泊に1人泊',
 "p_t4": "延べ宿泊者数の全国順位", "p_t4s": '一方、外国人延べ宿泊者数は <b data-source="c_pref_sum" data-field="value" data-where="key=foreign_rank">—</b>',
 "p_c1t": "外国人宿泊の伸び率 上位5県（2025年）", "p_c1n": "47都道府県で伸びが大きかった5県と全国平均。カーソルを合わせると各県の外国人割合が見られます。",
 "cp_t": "47都道府県の外国人割合と伸び率", "cp_d": "各都道府県の延べ宿泊者数に占める外国人の割合、外国人宿泊の前年比、各種順位。",
 "cs_t": "47都道府県の中の新潟", "cs_d": "新潟の割合順位・伸び率順位・総数順位・外国人数順位、全国中央値、何人泊につき外国人1人泊か。",
 "ax_x": "宿泊に占める外国人の割合 →", "ax_y": "↑ 外国人宿泊の伸び率", "median": "中央値", "natg": "全国の伸び", "share_l": "割合", "growth_l": "伸び率", "rank_pre": "", "rank_post": " 位",
 "ce_t": "原油・天然ガスのシェアと人口シェア", "ce_d": "新潟の原油・天然ガス生産量の全国シェアと、人口シェアに対する倍率。",
 "cr_t": "お米のシェアと1人あたり", "cr_d": "主食用米収穫量の全国シェア、北海道との差、県民1人あたり・国民1人あたりのkg。",
 "ct_t": "インバウンド宿泊の構造", "ct_d": "宿泊に占める外国人の割合、住民1人あたり外国人宿泊、前年比から逆算した前年値と日本人宿泊の増減。",
 "cd_t": "神社・白鳥・米菓の密度", "cd_d": "人口1万人あたり神社数（新潟と全国）、ハクチョウ飛来数の全国シェア、県民1人あたり米菓出荷額。",
 "x": " 倍", "kg": "",
},
}

TEMPLATE = open(os.path.join(base, "page_template.html")).read()

for lang, t in T.items():
    s = TEMPLATE
    feat = "\n".join(
        f'''      <div class="nz-card nz-feat"><div class="nz-label" data-source="firsts" data-field="item" data-where="code={c}">—</div>
        <div class="nz-big dash-skeleton" data-source="firsts" data-field="value" data-where="code={c}">—</div>
        <div class="nz-unit" data-source="firsts" data-field="unit" data-where="code={c}">—</div>
        <div class="nz-sub">{note}</div></div>''' for c, note in t["f"])
    nav = "".join(f'<a href="#{a}">{n}</a>' for a, n in zip(["sec-energy", "sec-rice", "sec-tour", "sec-density", "sec-fun", "sec-firsts"], t["nav"]))
    th = t["th"]
    rep = dict(t); rep["FEAT"] = feat; rep["NAV"] = nav
    rep.update({f"th{i}": v for i, v in enumerate(th)})
    rep["JS_T"] = json.dumps({k: t[k] for k in ["oil", "gas", "pop", "jp", "fr", "tot", "nights", "lbl_jp", "lbl_ni", "rice_tip_unit", "rice_tip_rank", "x", "ax_x", "ax_y", "median", "natg", "share_l", "growth_l", "rank_pre", "rank_post"]}, ensure_ascii=False)
    for k, v in rep.items():
        if isinstance(v, str):
            s = s.replace("[[" + k + "]]", v)
    import re
    left = re.findall(r"\[\[[A-Za-z_0-9]+\]\]", s)
    assert not left, left
    open(os.path.join(base, lang, "index.html"), "w").write(s)
    json.dump({"text": s}, open(os.path.join(base, lang, "index_doc.json"), "w"), ensure_ascii=False)
    print(lang, len(s.encode()))
