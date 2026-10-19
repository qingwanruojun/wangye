/**
 * 浏览器内 RAG：与 server/rag.py 保持同一套分词、TF-IDF 检索和句子抽取规则。
 * 索引由 scripts/build_rag_index.py 生成到 js/rag-index.js。
 */

(function () {
  "use strict";

  const CJK_RE = /[一-鿿]+/g;
  const LATIN_RE = /[a-z0-9]+/g;
  const SENTENCE_RE = /[^。！？\n]+[。！？]?/g;
  const PUNCT_RE = /[\s，。；：、！？「」『』“”‘’（）()\[\]【】¥$%\-—–/\\.,;:!?"'·]+/g;

  const GREETING_RE =
    /^(你好|您好|hi|hello|hey|在吗|你是谁|你叫什么|介绍一下你自己|能做什么|你会什么)[\s!！。.？?]*$/i;
  const FOLLOWUP_RE = /^(那|那么|还有|这个|那个|这些|上述|上面|刚才|它|他|她)|呢[？?]?\s*$/;

  const QUESTION_STOPWORDS = new Set([
    "什么", "怎么", "如何", "哪些", "哪个", "是否", "可以", "能不能", "有没有",
    "这个", "那个", "一下", "请问", "告诉", "我们", "你们", "他们", "以及",
    "多少", "为什么", "目前", "现在", "相关", "情况", "介绍", "说说", "看看",
    "是什", "有哪", "怎样", "为什", "能否", "是", "的", "了", "在", "和",
    "与", "及", "或", "也", "都", "有", "吗", "呢", "吧", "啊",
  ]);

  const GREETING_ANSWER =
    "你好，我是乡播 AI 问答助手。我可以基于本项目的台账知识库回答：主播成长、视频号流量、电商分成、农文旅运营、村庄适配度评估、隐私合规，以及 RAG / LoRA 的实现方式。";
  const EMPTY_ANSWER =
    "请先输入一个问题，例如「香椿季有哪些爆款选题？」";
  const MISS_ANSWER =
    "知识库中没有检索到足够相关的内容。可以换一种问法，或试试：账号表现、六阶成长、创作分成、香椿季选题、AHP 适配度、隐私保护。";

  function tokenize(text) {
    const lower = String(text).toLowerCase();
    const tokens = (lower.match(LATIN_RE) || []).slice();
    for (const run of lower.match(CJK_RE) || []) {
      for (let i = 0; i < run.length - 1; i += 1) tokens.push(run.slice(i, i + 2));
      for (const char of run) tokens.push(char);
    }
    return tokens.filter((token) => !QUESTION_STOPWORDS.has(token));
  }

  function tokenWeight(token) {
    return token.length === 1 && /^[一-鿿]$/.test(token) ? 0.3 : 1.0;
  }

  function countTokens(text) {
    const counts = Object.create(null);
    for (const token of tokenize(text)) {
      counts[token] = (counts[token] || 0) + 1;
    }
    return counts;
  }

  function charBigrams(text) {
    const normalized = String(text).replace(PUNCT_RE, "");
    if (normalized.length < 2) return new Set(normalized ? [normalized] : []);
    const grams = new Set();
    for (let i = 0; i < normalized.length - 1; i += 1) {
      grams.add(normalized.slice(i, i + 2));
    }
    return grams;
  }

  function overlapCoefficient(a, b) {
    if (!a.size || !b.size) return 0;
    let shared = 0;
    for (const gram of a) if (b.has(gram)) shared += 1;
    return shared / Math.min(a.size, b.size);
  }

  function intersects(queryGrams, tokens) {
    for (const gram of queryGrams) {
      if (tokens[gram]) return true;
    }
    return false;
  }

  function retrievalQuery(question, history) {
    if (!history || !history.length || !FOLLOWUP_RE.test(question)) return question;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const item = history[i];
      if (item && item.role === "user" && item.content) {
        const previous = String(item.content).trim();
        if (previous && previous !== question) return `${previous} ${question}`;
        break;
      }
    }
    return question;
  }

  function toSource(chunk, score) {
    return {
      doc: chunk.doc,
      title: chunk.title,
      heading: chunk.heading,
      snippet: String(chunk.text).slice(0, 220).replace(/\n/g, " ").trim(),
      score: Math.round(score * 10000) / 10000,
    };
  }

  class BrowserRag {
    constructor(index) {
      this.documents = index.documents || [];
      this.idf = index.idf || {};
      this.chunks = index.chunks || [];
    }

    get stats() {
      return { documents: this.documents.length, chunks: this.chunks.length };
    }

    queryVector(question) {
      const counts = countTokens(question);
      const entries = Object.entries(counts);
      const total = entries.reduce((sum, [, count]) => sum + count, 0);
      if (!total) return {};

      const vector = {};
      let squares = 0;
      for (const [token, count] of entries) {
        if (!Object.prototype.hasOwnProperty.call(this.idf, token)) continue;
        const value = (count / total) * this.idf[token] * tokenWeight(token);
        vector[token] = value;
        squares += value * value;
      }
      const norm = Math.sqrt(squares) || 1;
      for (const token of Object.keys(vector)) vector[token] /= norm;
      return vector;
    }

    search(question, topK) {
      const query = this.queryVector(question);
      const entries = Object.entries(query);
      if (!entries.length) return [];

      const queryBigrams = new Set(
        entries.filter(([token]) => token.length >= 2).map(([token]) => token)
      );
      const scored = [];
      for (const chunk of this.chunks) {
        if (queryBigrams.size && !intersects(queryBigrams, chunk.tokens)) continue;
        let score = 0;
        for (const [token, value] of entries) {
          if (chunk.weight[token]) score += value * chunk.weight[token];
        }
        if (score > 0) scored.push([chunk, score]);
      }
      scored.sort((a, b) => b[1] - a[1]);
      return scored.slice(0, topK);
    }

    sentencePick(question, results, limit) {
      const query = this.queryVector(question);
      const entries = Object.entries(query);
      if (!entries.length || !results.length) return [];

      const queryBigrams = new Set(
        entries.filter(([token]) => token.length >= 2).map(([token]) => token)
      );
      const topScore = results[0][1];
      const candidates = [];

      for (const [chunk, chunkScore] of results) {
        if (chunkScore < topScore * 0.4) break;

        const numbered = String(chunk.text)
          .split(/\r?\n/)
          .map((line) => line.match(/^\s*\d+[.、]\s*(.+?)\s*$/))
          .filter(Boolean)
          .map((match) => match[1].trim().replace(/[。；，、\s]+$/, ""));
        const hasNumbered =
          numbered.length >= 2 && numbered.every((item) => item.length <= 14);

        if (hasNumbered) {
          const grouped = `${chunk.heading}：${numbered.join("、")}。`;
          const tokens = countTokens(grouped);
          if (intersects(queryBigrams, tokens)) {
            let overlap = 0;
            for (const [token, count] of Object.entries(tokens)) {
              overlap += (query[token] || 0) * (this.idf[token] || 0) * count;
            }
            candidates.push([overlap + chunkScore * 0.35, grouped]);
          }
        }

        for (const rawSentence of String(chunk.text).match(SENTENCE_RE) || []) {
          let sentence = rawSentence.replace(/^[ \n\-*#]+|[ \n\-*#]+$/g, "");
          if (sentence.length < 6) continue;
          if (hasNumbered && /^\d+[.、]/.test(sentence)) continue;
          sentence = sentence.replace(/^\d+[.、]\s*/, "");

          const tokens = countTokens(`${chunk.heading}。${sentence}`);
          if (!intersects(queryBigrams, tokens)) continue;

          let overlap = 0;
          for (const [token, count] of Object.entries(tokens)) {
            overlap += (query[token] || 0) * (this.idf[token] || 0) * count;
          }
          candidates.push([overlap + chunkScore * 0.35, sentence]);
        }
      }

      candidates.sort((a, b) => b[0] - a[0]);
      if (!candidates.length || candidates[0][0] <= 0) return [];

      const floor = candidates[0][0] * 0.4;
      const picked = [];
      const pickedGrams = [];
      for (const [score, sentence] of candidates) {
        if (score < floor) break;
        const grams = charBigrams(sentence);
        if (pickedGrams.some((prev) => overlapCoefficient(grams, prev) >= 0.45)) continue;
        picked.push(sentence);
        pickedGrams.push(grams);
        if (picked.length >= limit) break;
      }
      return picked;
    }

    answer(question, options) {
      const started = performance.now();
      const topK = (options && options.topK) || 4;
      const history = (options && options.history) || [];
      const text = String(question || "").trim();

      let result;
      if (!text) {
        result = { answer: EMPTY_ANSWER, sources: [] };
      } else if (GREETING_RE.test(text)) {
        result = { answer: GREETING_ANSWER, sources: [] };
      } else {
        const searchQuery = retrievalQuery(text, history);
        const results = this.search(searchQuery, topK);
        const sources = results.map(([chunk, score]) => toSource(chunk, score));
        const best = results.length ? results[0][1] : 0;

        if (!results.length || best < 0.1) {
          result = { answer: MISS_ANSWER, sources };
        } else {
          const sentences = this.sentencePick(searchQuery, results, 3);
          const body = sentences.length
            ? sentences.join("")
            : String(results[0][0].text).slice(0, 300);
          result = { answer: `根据项目知识库：${body}`, sources };
        }
      }

      result.mode = "browser-rag";
      result.latency_ms = Math.round((performance.now() - started) * 10) / 10;
      return result;
    }
  }

  window.BrowserRag = {
    create(index) {
      if (!index || !Array.isArray(index.chunks) || !index.chunks.length) return null;
      return new BrowserRag(index);
    },
  };
})();
