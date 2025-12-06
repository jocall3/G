# services/forge-service/src/generators/summary_generator.py

import os
import logging
from typing import Optional

try:
    import openai
except ImportError:
    raise ImportError(
        "The 'openai' library is required for SummaryGenerator. "
        "Please install it with 'pip install openai'."
    )

# Configure logging for the service
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Constants for Summary Generation ---

# Covenant 15: Use a low temperature for factual coherence and determinism.
SUMMARY_TEMPERATURE = 0.1

# A cost-effective and capable model for summarization tasks.
SUMMARY_MODEL = "gpt-4o-mini"

# A reasonable token limit for a concise summary.
MAX_SUMMARY_TOKENS = 512

# System prompt to guide the model's behavior towards factual summarization.
SYSTEM_PROMPT = """
You are an expert summarization engine. Your sole purpose is to generate a concise,
accurate, and factual summary of the provided text. You must adhere to the following rules:
1. Do not introduce any information that is not explicitly stated in the original text.
2. Do not add personal opinions, interpretations, or analysis.
3. Focus on the main points, key findings, and essential information.
4. The summary must be coherent, well-written, and easy to understand.
5. Output only the summary text, with no additional commentary or introductory phrases.
""".strip()


class SummaryGenerator:
    """
    A service class for generating factual summaries of articles.

    This generator uses a large language model with a low temperature setting
    to ensure the output is factually coherent and grounded in the source text,
    as per Covenant 15 of the project's design principles.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initializes the SummaryGenerator and the OpenAI client.

        Args:
            api_key (Optional[str]): The OpenAI API key. If not provided, it will
                                     be fetched from the OPENAI_API_KEY environment
                                     variable.

        Raises:
            ValueError: If the API key is not provided and cannot be found in
                        the environment variables.
        """
        resolved_api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not resolved_api_key:
            logger.error("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")
            raise ValueError("OpenAI API key is required but was not found.")

        try:
            self.client = openai.OpenAI(api_key=resolved_api_key)
            logger.info("SummaryGenerator initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
            raise

    def generate(self, article_text: str) -> str:
        """
        Generates a summary for the given article text.

        Args:
            article_text (str): The full text of the article to be summarized.

        Returns:
            str: The generated summary.

        Raises:
            ValueError: If the article_text is empty or None.
            RuntimeError: If the API call fails or returns an unusable response.
        """
        if not article_text or not article_text.strip():
            logger.warning("Attempted to generate summary for empty text.")
            raise ValueError("Article text cannot be empty.")

        logger.info(f"Generating summary for article of length {len(article_text)} characters.")

        try:
            response = self.client.chat.completions.create(
                model=SUMMARY_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Please summarize the following article:\n\n---\n\n{article_text}"}
                ],
                temperature=SUMMARY_TEMPERATURE,
                max_tokens=MAX_SUMMARY_TOKENS,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )

            if response.choices and response.choices[0].message.content:
                summary = response.choices[0].message.content.strip()
                logger.info(f"Successfully generated summary of length {len(summary)} characters.")
                return summary
            else:
                logger.error("API response was empty or did not contain expected content.")
                raise RuntimeError("Failed to generate summary: API returned an empty response.")

        except openai.APIError as e:
            logger.error(f"OpenAI API error occurred: {e}", exc_info=True)
            raise RuntimeError(f"An API error occurred while generating the summary: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during summary generation: {e}", exc_info=True)
            raise RuntimeError(f"An unexpected error occurred: {e}")


if __name__ == '__main__':
    # This block serves as a simple demonstration and test of the SummaryGenerator.
    # To run this, ensure the OPENAI_API_KEY environment variable is set.
    print("--- Running SummaryGenerator Demonstration ---")
    if not os.getenv("OPENAI_API_KEY"):
        print("\nERROR: OPENAI_API_KEY environment variable not set.")
        print("Please set it to run the demonstration.")
    else:
        try:
            generator = SummaryGenerator()
            sample_article = """
            InfiniteAI, a burgeoning tech startup, announced today the launch of its flagship product,
            'Forge', a comprehensive platform designed to streamline AI-powered content creation for businesses.
            The platform integrates several advanced language models to assist with tasks ranging from blog
            post generation to marketing copy and technical documentation. The company's CEO, speaking at
            the launch event, emphasized that Forge is built on a foundation of ethical AI principles,
            ensuring transparency and user control over the generated content. Early access partners have
            reported significant productivity gains, with some noting a 50% reduction in content creation time.
            The service will be available globally starting next month, with tiered pricing plans to cater
            to individual creators, small businesses, and large enterprises. The core technology is protected
            by a UCC1 filing, which the company describes as a 'transmitting utility' for digital value.
            """
            summary = generator.generate(sample_article)
            print("\n--- Original Article ---")
            print(sample_article.strip())
            print("\n--- Generated Summary (Factual, Low Temperature) ---")
            print(summary)
        except (ValueError, RuntimeError, ImportError) as e:
            print(f"\nAn error occurred during the demonstration: {e}")
        except Exception as e:
            print(f"\nAn unexpected error occurred: {e}")