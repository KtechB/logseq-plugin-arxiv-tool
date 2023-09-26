import "@logseq/libs"; //https://plugins-doc.logseq.com/
/* main */
const main = () => {
  logseq.Editor.registerSlashCommand("arxiv", async () => {
    const { content, uuid } = (await logseq.Editor.getCurrentBlock()) ?? {};
    if (content && uuid) {
      await parseBlockForLink(uuid, content);
    }

    logseq.App.showMsg(`
        hoghoge
        [:div.p-2
          [:h1 "#${uuid}"]
          [:h2.text-xl "${content}"]]
      `);
  });
}; /* end_main */

const parseBlockForLink = async (uuid: string, content: string) => {
  // Check if the content contains an arXiv link
  const arxivLink = content.match(/https?:\/\/arxiv\.org\/abs\/(\d+\.\d+)/);
  if (arxivLink) {
    const arxivID = arxivLink[1];
    // Fetch arXiv title, date, and other data
    const arxivData = await fetchArxivTitle(arxivID);
    if (arxivData) {
      // Modify the block content
      const newContent = content.replace(
        arxivLink[0],
        `[${arxivData.title}](https://arxiv.org/abs/${arxivID})
        published:: ${arxivData.published}
        summary:: ${arxivData.summary.replace(/\n/g, " ")}}`
      );

      await logseq.Editor.updateBlock(uuid, newContent);
    }
  }
};

const fetchArxivTitle = async (arxivID: string) => {
  const query = `id_list=${arxivID}`;
  const resp = (await fetchArxivEntries(query)) ?? undefined;
  if (resp) {
    // fetch first
    return resp[0];
  }
  return undefined;
};
class ArxivEntry {
  id: string;
  updated: string;
  published: string;
  title: string;
  summary: string;
  authors: Array<{ name: string; affiliation: string }>;
  doi: string;
  comment: string;
  journalRef: string;
  primaryCategory: string;
  categories: Array<string>;

  constructor(entryElement: Element) {
    this.id = entryElement.querySelector("id")?.textContent || "";
    this.updated = entryElement.querySelector("updated")?.textContent || "";
    this.published = entryElement.querySelector("published")?.textContent || "";
    this.title = entryElement.querySelector("title")?.textContent || "";
    this.summary = entryElement.querySelector("summary")?.textContent || "";
    this.authors = Array.from(entryElement.querySelectorAll("author")).map(
      (author) => ({
        name: author.querySelector("name")?.textContent || "",
        affiliation:
          author.querySelector("arxiv\\:affiliation, affiliation")
            ?.textContent || "",
      })
    );
    this.doi =
      entryElement.querySelector("arxiv\\:doi, doi")?.textContent || "";
    this.comment =
      entryElement.querySelector("arxiv\\:comment, comment")?.textContent || "";
    this.journalRef =
      entryElement.querySelector("arxiv\\:journal_ref, journal_ref")
        ?.textContent || "";
    this.primaryCategory =
      entryElement
        .querySelector("arxiv\\:primary_category, primary_category")
        ?.getAttribute("term") || "";
    this.categories = Array.from(entryElement.querySelectorAll("category")).map(
      (cat) => cat.getAttribute("term") || ""
    );
  }
}
const dsl = (text: string) => {
  return {
    key: "selection-end-text-dialog",
    close: "outside",
    template: `
    <div style="padding: 10px; overflow: auto;">
        <h3>${text}</h3>
    </div>
    `,
    style: {
      left: 300 + "px",
      top: 300 + "px",
      width: "300px",
      backgroundColor: "var(--ls-primary-background-color)",
      color: "var(--ls-primary-text-color)",
      boxShadow: "1px 2px 5px var(--ls-secondary-background-color)",
    },
    attrs: {
      title: "A Translator",
    },
  };
};
const fetchArxivEntries = async (query: string) => {
  try {
    const response = await fetch(`http://export.arxiv.org/api/query?${query}`);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");

    const entries = Array.from(doc.querySelectorAll("entry")).map(
      (entryElement) => new ArxivEntry(entryElement)
    );

    return entries;
  } catch (error) {
    console.error("Failed to fetch arXiv data:", error);

    logseq.App.showMsg(`error${error}`);
    return null;
  }
};

logseq.ready(main).catch(console.error);
