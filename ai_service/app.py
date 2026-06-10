#!/usr/bin/env python3
"""
Smart Interview Platform - AI Evaluation Service
Uses NLP (NLTK + Scikit-learn) to evaluate interview answers
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
import re
import math
from collections import Counter

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('punkt_tab', quiet=True)
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    NLTK_AVAILABLE = True
except Exception as e:
    print(f"NLTK setup warning: {e}")
    NLTK_AVAILABLE = False

app = Flask(__name__)
CORS(app)


def preprocess(text):
    """Clean and tokenize text"""
    if not text:
        return []
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    tokens = text.split()
    if NLTK_AVAILABLE:
        try:
            stop_words = set(stopwords.words('english'))
            tokens = [t for t in tokens if t not in stop_words and len(t) > 2]
        except:
            pass
    return tokens


def compute_tfidf_similarity(answer_tokens, ideal_tokens):
    """Compute TF-IDF cosine similarity between answer and ideal answer"""
    if not answer_tokens or not ideal_tokens:
        return 0.0

    # Build vocabulary
    vocab = list(set(answer_tokens + ideal_tokens))

    def tf(tokens, word):
        return tokens.count(word) / len(tokens) if tokens else 0

    def idf(word, docs):
        containing = sum(1 for doc in docs if word in doc)
        return math.log((1 + len(docs)) / (1 + containing)) + 1

    docs = [answer_tokens, ideal_tokens]

    def tfidf_vec(tokens):
        return [tf(tokens, w) * idf(w, docs) for w in vocab]

    v1 = tfidf_vec(answer_tokens)
    v2 = tfidf_vec(ideal_tokens)

    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a**2 for a in v1))
    mag2 = math.sqrt(sum(b**2 for b in v2))

    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


def evaluate_answer(question, answer, expected_keywords, ideal_answer, time_taken, time_limit):
    """Main evaluation function - returns score, feedback, and matched keywords"""
    if not answer or not answer.strip():
        return {
            "score": 0,
            "feedback": "No answer was provided. Please attempt every question.",
            "keywords_matched": [],
            "breakdown": {}
        }

    answer_lower = answer.lower().strip()
    answer_tokens = preprocess(answer)
    word_count = len(answer.split())

    # ─── 1. Keyword Matching Score (35 points) ─────────────────────────────
    keywords = [k.strip().lower() for k in (expected_keywords or '').split(',') if k.strip()]
    matched_kws = []
    for kw in keywords:
        # Check exact and partial matches
        if kw in answer_lower or any(kw in token for token in answer_lower.split()):
            matched_kws.append(kw)
    keyword_score = (len(matched_kws) / len(keywords) * 35) if keywords else 17.5

    # ─── 2. Content Similarity Score (25 points) ───────────────────────────
    similarity_score = 0
    if ideal_answer and ideal_answer.strip():
        ideal_tokens = preprocess(ideal_answer)
        similarity = compute_tfidf_similarity(answer_tokens, ideal_tokens)
        similarity_score = similarity * 25

    # ─── 3. Answer Length Score (20 points) ────────────────────────────────
    if word_count >= 100:
        length_score = 20
    elif word_count >= 70:
        length_score = 17
    elif word_count >= 50:
        length_score = 13
    elif word_count >= 30:
        length_score = 8
    elif word_count >= 15:
        length_score = 4
    else:
        length_score = 1

    # ─── 4. Structure Score (10 points) ────────────────────────────────────
    sentences = answer.split('.')
    has_multiple_sentences = len([s for s in sentences if len(s.strip()) > 10]) >= 2
    has_examples = any(w in answer_lower for w in ['example', 'instance', 'when i', 'for instance', 'such as', 'like when', 'time when'])
    has_numbers = bool(re.search(r'\d+', answer))
    structure_score = 0
    if has_multiple_sentences: structure_score += 4
    if has_examples: structure_score += 4
    if has_numbers: structure_score += 2

    # ─── 5. Time Management Score (10 points) ──────────────────────────────
    time_limit = time_limit or 120
    if time_taken and time_taken > 0:
        ratio = time_taken / time_limit
        if 0.3 <= ratio <= 1.0:
            time_score = 10
        elif ratio < 0.3:
            time_score = 4  # Too fast
        else:
            time_score = 6  # Over time
    else:
        time_score = 7  # Default if no time data

    # ─── Total Score ────────────────────────────────────────────────────────
    total = min(100, keyword_score + similarity_score + length_score + structure_score + time_score)
    total = round(total, 2)

    # ─── Feedback Generation ────────────────────────────────────────────────
    feedback_parts = []

    # Keyword feedback
    if not matched_kws and keywords:
        feedback_parts.append(f"Missing key concepts. Try including: {', '.join(keywords[:4])}.")
    elif len(matched_kws) < len(keywords) / 2:
        missed = [k for k in keywords if k not in matched_kws]
        feedback_parts.append(f"You covered {len(matched_kws)}/{len(keywords)} keywords. Also mention: {', '.join(missed[:3])}.")
    else:
        feedback_parts.append(f"Great! You covered {len(matched_kws)} key concepts.")

    # Length feedback
    if word_count < 20:
        feedback_parts.append("Answer is very short — expand with more detail and examples.")
    elif word_count < 40:
        feedback_parts.append("Answer is a bit brief. Aim for 3-4 sentences with a real example.")
    elif word_count > 200:
        feedback_parts.append("Good detail, but keep answers focused — avoid over-explaining.")
    else:
        feedback_parts.append("Good answer length.")

    # Structure feedback
    if not has_examples:
        feedback_parts.append("Add a specific real-world example to make your answer stronger.")
    if not has_multiple_sentences:
        feedback_parts.append("Structure your answer into multiple clear sentences.")

    # Score-based summary
    if total >= 80:
        feedback_parts.append("Excellent response! Very interview-ready.")
    elif total >= 65:
        feedback_parts.append("Good answer. Minor improvements will make it strong.")
    elif total >= 45:
        feedback_parts.append("Average. Focus on depth, structure, and relevant keywords.")
    else:
        feedback_parts.append("Practice more. Review the STAR method and key topics.")

    return {
        "score": total,
        "feedback": " ".join(feedback_parts),
        "keywords_matched": matched_kws,
        "breakdown": {
            "keyword_score": round(keyword_score, 2),
            "similarity_score": round(similarity_score, 2),
            "length_score": length_score,
            "structure_score": structure_score,
            "time_score": time_score
        }
    }


@app.route('/evaluate', methods=['POST'])
def evaluate():
    """Main evaluation endpoint"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    result = evaluate_answer(
        question=data.get('question', ''),
        answer=data.get('answer', ''),
        expected_keywords=data.get('expected_keywords', ''),
        ideal_answer=data.get('ideal_answer', ''),
        time_taken=data.get('time_taken', 0),
        time_limit=data.get('time_limit', 120)
    )
    return jsonify(result)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "SIP AI Evaluation", "nltk": NLTK_AVAILABLE})


@app.route('/batch-evaluate', methods=['POST'])
def batch_evaluate():
    """Evaluate multiple answers at once"""
    data = request.get_json()
    answers = data.get('answers', [])
    results = []
    for item in answers:
        result = evaluate_answer(
            question=item.get('question', ''),
            answer=item.get('answer', ''),
            expected_keywords=item.get('expected_keywords', ''),
            ideal_answer=item.get('ideal_answer', ''),
            time_taken=item.get('time_taken', 0),
            time_limit=item.get('time_limit', 120)
        )
        results.append(result)
    return jsonify({"results": results})


if __name__ == '__main__':
    print("\n🤖 Smart Interview Platform - AI Service")
    print("   Running on http://localhost:8000\n")
    app.run(host='0.0.0.0', port=8000, debug=True)
