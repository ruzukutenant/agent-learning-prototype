# Prompt Repetition Technique: Discussion and Examples

This Markdown document compiles the entire conversation about the "Prompt Repetition" technique, as discussed in a Google Research paper (published December 2025). The technique involves repeating a prompt twice to improve LLM performance by enhancing token attention in transformers. The content is structured for easy import into tools like Claude's code interpreter or projects, with sections for the original query, explanations, and examples. Prompts are formatted as code blocks for clarity.

## Original Query: Does This Work? If So, Why?

The user shared an article excerpt from Ilia Karelin (dated Jan 07, 2026) titled "The Dumbest Prompting Trick That Actually Works." The article describes a Google Research finding where repeating prompts wins 47 out of 70 benchmarks across models like GPT-4o, Claude, Gemini, and DeepSeek, with no downsides.

Key points from the article:
- **Technique**: Repeat the entire prompt twice (e.g., `<QUERY><QUERY>`).
- **Why it works**: LLMs process prompts left-to-right with causal attention; early tokens can't see later ones. Repetition allows the second copy to attend to the full first copy.
- **Results**: 47 wins, 0 losses, 23 ties on benchmarks like ARC, OpenBookQA, GSM8K, MMLU-Pro, MATH.
- **No downsides**: No increased latency, output length, or format changes.
- **When not to use**: Minimal help on pure reasoning tasks.

The article includes explanations, figures (not reproduced here), and links to related posts.

## Response: Confirmation and Explanation

Yes, this technique does work, particularly for non-reasoning tasks where the model is expected to provide a direct answer without step-by-step thinking. According to a Google Research paper published in December 2025, simply repeating the entire prompt (transforming it from "<QUERY>" to "<QUERY><QUERY>") led to statistically significant improvements in 47 out of 70 benchmark-model combinations across models like Gemini 2.0 Flash, GPT-4o, Claude 3.7 Sonnet, and DeepSeek V3, with no losses and 23 ties.

The gains were especially notable in retrieval-heavy tasks, such as identifying a specific item from a long list, where one model improved from 21.33% to 97.33% accuracy. Importantly, it doesn't increase latency, output length, or change response formats, making it a low-cost enhancement.

The reason it works stems from how transformer-based LLMs process prompts through causal attention: tokens can only attend to previous tokens in the sequence, not future ones. This means early parts of a single prompt can't "see" later parts during initial processing. By repeating the prompt, the second instance allows every token to attend to the full context of the first copy, effectively giving the model a complete preview before generation begins. This is most effective for straightforward queries without explicit reasoning instructions (e.g., no "think step by step"), as reasoning prompts already mitigate some attention limitations through intermediate steps. For scenarios where it doesn't help much, like pure reasoning tasks, the baseline performance is often already high.

## Follow-Up Query: Examples of Effective Use in Real-World Scenarios

The user asked for examples of how to use this technique effectively.

## Response: Real-World Examples

Here are several real-world examples of how to apply the prompt repetition technique effectively. These focus on non-reasoning tasks where the technique shines, such as retrieval or direct extraction, rather than step-by-step logic puzzles.

### 1. Extracting Key Details from a Long Document or Article
- **Scenario**: You're using an LLM to pull specific information from a lengthy report, like a business summary or legal document, where the query is at the end but relies on earlier context.
- **Why it helps**: In a single prompt, early document tokens can't "see" the query, leading to missed connections. Repetition lets the model preview the full context.
- **Original Prompt**:
  ```
  Here is the full text of the quarterly earnings report: [insert long report text]. What was the revenue growth percentage in Q4?
  ```
- **Repeated Prompt**:
  ```
  Here is the full text of the quarterly earnings report: [insert long report text]. What was the revenue growth percentage in Q4?Here is the full text of the quarterly earnings report: [insert long report text]. What was the revenue growth percentage in Q4?
  ```
- **Expected Improvement**: Higher accuracy in spotting buried details, especially if the report is thousands of tokens long. In benchmarks like retrieval tasks, this boosted performance by up to 4x without adding verbosity.

### 2. Generating Structured Output from Instructions
- **Scenario**: Creating JSON or formatted lists based on user input, such as parsing customer feedback into categories for a CRM tool.
- **Why it helps**: Instructions at the prompt's start (e.g., format rules) might be overlooked when processing later input data. Repetition ensures the format guidelines are fully attended to.
- **Original Prompt**:
  ```
  Output in JSON format with keys: sentiment, key_issues, suggestions. Analyze this feedback: 'The app crashes often, but I love the UI. Add more themes.'
  ```
- **Repeated Prompt**:
  ```
  Output in JSON format with keys: sentiment, key_issues, suggestions. Analyze this feedback: 'The app crashes often, but I love the UI. Add more themes.'Output in JSON format with keys: sentiment, key_issues, suggestions. Analyze this feedback: 'The app crashes often, but I love the UI. Add more themes.'
  ```
- **Expected Improvement**: More consistent adherence to the structure, reducing errors like missing keys or invalid JSON. This is ideal for API integrations where format matters.

### 3. Answering Factual Questions with Provided Context
- **Scenario**: Quick knowledge checks in a chatbot, like identifying a historical fact from a provided timeline, useful in educational apps or trivia games.
- **Why it helps**: The context (timeline) comes first, but the question last—repetition allows the question to influence processing of the context retroactively.
- **Original Prompt**:
  ```
  Timeline of events: 1776 - Declaration of Independence; 1787 - Constitution signed; 1861 - Civil War begins. When was the U.S. Constitution signed?
  ```
- **Repeated Prompt**:
  ```
  Timeline of events: 1776 - Declaration of Independence; 1787 - Constitution signed; 1861 - Civil War begins. When was the U.S. Constitution signed?Timeline of events: 1776 - Declaration of Independence; 1787 - Constitution signed; 1861 - Civil War begins. When was the U.S. Constitution signed?
  ```
- **Expected Improvement**: Fewer hallucinations or incorrect pulls from the list, with benchmarks showing big gains in accuracy for similar open-book QA tasks.

### 4. Creative Content Generation with Constraints
- **Scenario**: Writing product descriptions or ad copy with specific guidelines, like tone and length, for e-commerce or marketing tools.
- **Why it helps**: Constraints (e.g., "keep it under 100 words") at the beginning can fade by the time the model processes the topic—repetition reinforces them.
- **Original Prompt**:
  ```
  Write a fun, engaging product description for a wireless earbuds set. Keep it under 100 words and highlight noise cancellation.
  ```
- **Repeated Prompt**:
  ```
  Write a fun, engaging product description for a wireless earbuds set. Keep it under 100 words and highlight noise cancellation.Write a fun, engaging product description for a wireless earbuds set. Keep it under 100 words and highlight noise cancellation.
  ```
- **Expected Improvement**: Better compliance with word limits and key highlights, without making outputs longer. This works well for models like Claude or GPT in creative but constrained tasks.

## Additional Tips from the Response
- **When to apply**: Best for prompts over 100-200 tokens where context is dense. Skip for pure reasoning (e.g., math problems with "step-by-step" instructions), as those already perform well without it.
- **Implementation**: Just copy-paste the prompt—no separators needed. Test on your LLM of choice; gains vary but are consistent across models like Gemini or DeepSeek.
- **Limitations**: It doubles token usage, so watch costs in high-volume apps. If your prompt is extremely long, consider summarizing first.

These examples are drawn from the technique's strengths in benchmarks, making it a quick win for everyday AI interactions.

## Metadata
- **Conversation Date**: January 20, 2026 (based on current time).
- **User**: @abecrystal (Raleigh, NC, US).
- **Source Paper**: Google Research, December 2025 (not directly linked here; refer to original article for details).

This document can be copied into a Markdown file (e.g., `prompt-repetition.md`) and imported into Claude or similar tools for further experimentation or coding. If needed, adapt the prompts by replacing placeholders like `[insert long report text]`.