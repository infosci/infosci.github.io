// The lab's research areas: what each card names, what it cites, and the
// search that finds its papers.
//
// Here rather than in app/page.tsx because two pages need them now — the home
// page draws the cards, and Publications counts them per year for the Over
// time view. The icons stay with the page, since a mark is the one part of a
// card that is a component rather than a fact about the area.
//
// Every card names a field, never a method. The lab is about fields, using
// diverse methods — that is the sentence to test a new card against, and it is
// also how the searches behind the titles are built.
//
// Each query names its field's OBJECT of study. Never the data source: Twitter,
// Reddit and "social media" are where several of these fields look, so those
// words put the suicide papers on two cards at once and said nothing about
// either. Never the method: graph, network, learning and classification are
// what the whole lab does. Objects are what separate fields; sources and
// methods are what they share, and a query built from them collides by
// construction.
//
// Tuned against the collection rather than guessed, and read as a list rather
// than as counts. Sixteen papers used to sit on two cards; six do now, and each
// of the six is genuinely two things — a scientometric review of a biomedical
// literature, coauthorship predicted with bibliographic embeddings, semantic
// change in biomedical text. Overlap that means something is worth keeping;
// overlap from a shared platform name is not.
//
// Loosen a term only to reach a paper nothing else reaches, and use the
// shortest stem that does it: "suicid" catches suicide, suicidal and
// suicidality. Then check what else the stem catches — the match is a
// substring, and "search" inside "research" once put ten scientometrics papers
// on the retrieval card.
//
// It is a rule with teeth. A graph learning card was proposed and rejected: it
// would have held fourteen papers across eight years, more than four of these
// seven, and it still had no place here. Methods have no natural boundary — if
// technique earns a card, so do contrastive learning, deep learning and network
// analysis, each equally true of the lab and each arguable only case by case.
// Fields carry their own edges: a body, a literature, a reference that does not
// move. Note that Computational Social Science and Computational Suicidology
// pass the test despite naming a method, because each also names an object of
// study; graph learning names only the tool.
//
// The cost is two papers of seventy-two that no card reaches — a graph neural
// network architecture and an attention network for sentiment. Both are method
// contributions with no domain, so under this rule they should have no card,
// and neither is hidden: both sit in Publications under Clarivate's categories
// and both answer to a search. Coverage is a question worth asking when a paper
// is added, not a quota to satisfy.
//
// Each card carries a mark, the field's name and a citation. Nothing in the
// citation is in our words — each links to the field's standing reference, the
// thing that does not change from year to year, so the definitional work is
// done by the field rather than by us. The search behind the title is ours, and
// visibly so.
//
// Digital Humanities is cited differently on purpose. Science of science has a
// canonical review and mental health informatics has a professional body that
// states its scope; DH has neither, and its own literature treats "what is
// DH?" as the open question. Kirschenbaum's chapter is the honest citation —
// it argues the field is a methodological outlook rather than a fixed object.
export const AREAS = [
  {
    id: "science-of-science",
    title: "Science of Science",
    source: {
      href: "https://www.science.org/doi/10.1126/science.aao0185",
      label: "Fortunato et al., Science (2018)",
    },
    q: "scientometric or bibliometric or citation or coauthor or collaboration or fund or team or peer review or academic or scholarly or orcid or knowledge diffusion or domain comparison or scientific article or scientific publication",
  },
  {
    // Widened from "Mental Health Informatics", and the widening is what earns
    // the link. Web of Science has no value meaning mental health — the lab's
    // papers on it scatter across Psychiatry, Nursing and, for the major
    // depressive disorder paper, Diabetes — so a link under the old name landed
    // on eleven papers of which four were about mental health. Under this name
    // all eleven belong: drug repurposing, UMLS mapping and biomedical term
    // similarity are health informatics, and the card no longer promises
    // otherwise.
    //
    // IMIA rather than AMIA now. AMIA's Mental Health Informatics working group
    // was exactly right for the old title and says nothing about this one, and
    // IMIA is the international body — the same reason 4S carries the science
    // and technology studies card instead of the European association. Its own
    // wording is "biomedical and health informatics", which contains this
    // card's name.
    //
    // Hersh, BMC Medical Informatics and Decision Making (2009), "A stimulus to
    // define informatics and health information technology", was the
    // alternative: a paper that defines the field rather than a body that
    // represents it. A body ages better, which is the whole point of these
    // references.
    id: "health-informatics",
    title: "Health Informatics",
    source: {
      href: "https://imia-medinfo.org/wp/",
      label: "International Medical Informatics Association",
    },
    q: "biomedical or drug or molecular or protein or caries or cancer or disease or medical or depress or umls or clinical",
  },
  {
    // The one card that cites the lab rather than the field, and the only one
    // that should. Every other links to something that does not change from
    // year to year — a review, a professional body, a book chapter — so the
    // definitional work is done by the field rather than by us.
    //
    // "Computational suicidology" has no canonical definition, no association
    // and no naming paper: it is a direction of work rather than an established
    // field. With nothing at field level to point at, the work that gives this
    // card its meaning is the lab's own, and saying so is more honest than
    // borrowing a methods review that does not use the term either. That
    // argument holds here and nowhere else on this page.
    //
    // The venue does much of the work: Suicide and Life-Threatening Behavior is
    // the journal of the American Association of Suicidology, so the card still
    // points into the field's own house. The title states both halves of the
    // name — the machine learning and the risk factors.
    //
    // Two references were passed over. Cox et al., Clinical Psychology Review
    // (2020), "Machine learning for suicidology", is the nearest field-level
    // review of the methods. Franklin et al., Psychological Bulletin (2017),
    // meta-analysed fifty years of risk factors down to near-chance prediction,
    // which is the finding that sent this work computational in the first place
    // — the reason for the field rather than an account of it.
    id: "computational-suicidology",
    title: "Computational Suicidology",
    source: {
      href: "https://doi.org/10.1111/sltb.12959",
      label: "Kim et al., Suicide and Life-Threatening Behavior (2023)",
    },
    // One of two cards that lead back into the site. Web of Science gives all six
    // of the lab's suicide papers the same Citation Topic, 1.21 Psychiatry, and
    // it holds nothing else of the seventy-two — so this lands on exactly those
    // six. The value is Clarivate's; the link merely names it.
    //
    // Inverting a card is what a "to" does: the title goes inward and the
    // citation takes over the outward link, so the reference stays one click
    // away either way.
    //
    // The health informatics card links the same way, and the two arrived there
    // from opposite directions: this one had a Clarivate value that fit its name
    // exactly, while that one was renamed until its name fit the value. Both
    // end at the same rule — a card links inward only when a single Web of
    // Science value holds the work the card names, and nothing else.
    q: "suicid",
  },
  {
    // 4S: the field's international body, founded 1975, and the parallel to
    // AMIA on the mental health card. Its page describes the field it fosters
    // as "social studies of science, technology, and medicine", noting that
    // field "includes Science and Technology Studies".
    //
    // Three other candidates were tried and rejected, each for a different
    // reason worth remembering: EASST matched this card's exact phrase but is
    // the European association, not the international one; the Handbook of STS
    // is the field's standard reference but its page reads as a book listing;
    // Harvard's "What is STS?" is purpose-built to define the field but speaks
    // for one programme rather than for the field.
    id: "science-and-technology-studies",
    title: "Science and Technology Studies",
    source: {
      href: "https://www.4sonline.org/what_is_4s.php",
      label: "Society for Social Studies of Science (4S)",
    },
    q: "ischool or knowledge trading or interdisciplin or teach",
  },
  {
    // Lazer et al. is to this field what Fortunato is to the science of science
    // card: the Science piece that named it and set its terms. Two labels on
    // this page now read "et al., Science", which is not a duplication to tidy
    // away — it is what the citations are.
    id: "computational-social-science",
    title: "Computational Social Science",
    source: {
      href: "https://www.science.org/doi/10.1126/science.1167742",
      label: "Lazer et al., Science (2009)",
    },
    q: "bullying or stalking or stigma or child abuse or victimization or workplace or minority",
  },
  {
    // The lab's earliest work and its largest Web of Science category
    // (Information Science & Library Science, 28 papers), and until now the one
    // area with no card: graph-based bibliographic search, visual query
    // interfaces, faceted navigation, entity identification. It was left off
    // not by decision but by oversight, which is what checking every paper
    // against the six cards turned up.
    //
    // SIGIR rather than the Manning textbook, on the same reasoning as 4S and
    // IMIA: a body outlasts an edition.
    //
    // No bare "search" in the query. The match is a substring — which is what
    // makes "suicid" find suicidality — and "search" sits inside "research", so
    // that one word pulled ten scientometrics papers onto this card. "bibliographic"
    // and "ontology-based" cover what it was there for. Any new term wants
    // checking against the list for the same trap.
    id: "information-retrieval",
    title: "Information Retrieval",
    source: {
      href: "https://sigir.org/",
      label: "ACM SIGIR",
    },
    q: "retrieval or bibliographic or query or faceted or semantic web or data modeling or information alignment or recommendation or ontology-based",
  },
  {
    id: "digital-humanities",
    title: "Digital Humanities",
    source: {
      href: "https://dhdebates.gc.cuny.edu/read/untitled-88c11800-9446-469b-a3be-3fdb36bfbd1e/section/f5640d43-b8eb-4d49-bc4b-eb31a16f3d06",
      label: "Kirschenbaum, Debates in the DH (2012)",
    },
    q: "word semantic change or opinion mining or book items",
  },
];
