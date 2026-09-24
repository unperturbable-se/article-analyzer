# ArticleClust — NLP Topic Clustering Engine from Scratch

**Live Demo:** [Article Analyzer Website](https://article-analyze.netlify.app/)

A Natural Language Processing pipeline and document similarity engine built entirely from scratch in Python and NumPy without relying on high-level libraries like NLTK, Scikit-Learn, or SpaCy.

ArticleClust converts unstructured text into numerical vector spaces, applies logarithmic TF-IDF feature weighting, computes full pairwise document similarity using vectorized linear algebra, and automatically groups documents into topic clusters.

---

## Key Features

* **Custom Text Preprocessing:** Custom string normalization, regex token filtering, and set-based stop-word removal.
* **Dynamic Master Vocabulary:** Fixed-index mapping across document collections.
* **Manual TF-IDF Weighting:** Term-frequency scaling combined with natural-logarithm Inverse Document Frequency (IDF) adjustment.
* **Vectorized Cosine Similarity:** Pairwise similarity matrix calculated using 2D NumPy matrix multiplication.
* **Unsupervised Topic Clustering:** Automatic grouping based on cosine thresholds and cluster topic labeling via TF-IDF feature centroid extraction.
* **Stateless Processing:** In-memory execution suitable for backend API deployment.

---

## Upcoming Features

* **WordNet Topic Categorization:** Integration with WordNet lexical databases to automatically map document content to high-level semantic categories.
* **Multi-Document Topic Matching:** Ability to select multiple documents and discover the overarching topic they are most strongly co-related to.

---

## Mathematical Engine Overview

The engine scales raw term frequencies by inverse document frequency, $IDF(t) = \ln(N / DF(t))$, to penalize common words across the corpus. It then normalizes the resulting TF-IDF vectors to unit length and computes all pairwise cosine similarities simultaneously using the dot product $X_{\text{norm}} \cdot X_{\text{norm}}^T$. The resulting cosine scores quantify the spatial angle between documents, providing a scale from 0.0 to 1.0 used directly for clustering.