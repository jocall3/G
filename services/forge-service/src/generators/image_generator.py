# services/forge-service/src/generators/image_generator.py

import logging
import os
from typing import Optional

import torch
from diffusers import DiffusionPipeline, AutoPipelineForText2Image
from PIL import Image

# Configure logging for the service
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Covenant 14: A standard set of negative prompts to ensure high-quality outputs.
# This helps avoid common image generation artifacts like distorted features,
# watermarks, and low-quality rendering, which are unsuitable for professional article headers.
DEFAULT_NEGATIVE_PROMPT = (
    "ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, "
    "out of frame, extra limbs, disfigured, deformed, body out of frame, "
    "bad anatomy, watermark, signature, cut off, low contrast, underexposed, "
    "overexposed, bad art, beginner, amateur, distorted face, blurry, "
    "draft, grainy, low quality, text, caption, logo, morbid, mutilated"
)

class ImageGenerator:
    """
    Handles the generation of images from text prompts using a diffusion model.
    This class is designed to be used for creating high-quality article headers.
    It encapsulates the model loading and generation logic.
    """

    def __init__(self, model_id: str = "stabilityai/stable-diffusion-xl-base-1.0"):
        """
        Initializes the ImageGenerator and loads the specified diffusion model.

        This is a heavy operation and should be done once when the service starts.

        Args:
            model_id (str): The Hugging Face model ID for the diffusion pipeline.
                            Defaults to Stable Diffusion XL for high-quality results.
        """
        self.model_id = model_id
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        logger.info(f"Initializing ImageGenerator on device: {self.device}")

        try:
            # Use AutoPipeline for flexibility and to leverage optimizations.
            # Stable Diffusion XL is chosen for its high resolution and quality,
            # which is ideal for article headers.
            self.pipeline = AutoPipelineForText2Image.from_pretrained(
                self.model_id,
                torch_dtype=self.torch_dtype,
                use_safetensors=True,
                variant="fp16" if self.device == "cuda" else None
            )
            self.pipeline.to(self.device)
            logger.info(f"Successfully loaded model '{self.model_id}' to {self.device}")
        except Exception as e:
            logger.error(f"Failed to load diffusion model '{self.model_id}': {e}")
            # This is a fatal error for the service, so we raise it.
            raise RuntimeError(f"Could not initialize ImageGenerator model: {e}") from e

    def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = DEFAULT_NEGATIVE_PROMPT,
        width: int = 1200,
        height: int = 675,  # 16:9 aspect ratio, good for blog headers
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> Image.Image:
        """
        Generates an image based on the provided prompts and parameters.

        Args:
            prompt (str): The text prompt describing the desired image.
            negative_prompt (Optional[str]): The text prompt describing what to avoid.
                                             Defaults to a standard set of quality-improving terms.
            width (int): The width of the generated image in pixels.
            height (int): The height of the generated image in pixels.
            num_inference_steps (int): The number of denoising steps. More steps can improve
                                       quality but increase generation time.
            guidance_scale (float): A value to control how much the prompt influences the output.
                                    Higher values mean stricter adherence to the prompt.

        Returns:
            Image.Image: A PIL Image object of the generated image.

        Raises:
            ValueError: If the prompt is empty or invalid.
            Exception: If the underlying image generation process fails.
        """
        if not prompt or not isinstance(prompt, str):
            raise ValueError("Prompt must be a non-empty string.")

        logger.info(f"Generating image for prompt: '{prompt[:100]}...'")
        logger.debug(f"Full prompt: {prompt}")
        logger.debug(f"Negative prompt: {negative_prompt}")
        logger.debug(
            f"Parameters: width={width}, height={height}, "
            f"steps={num_inference_steps}, scale={guidance_scale}"
        )

        try:
            # The generation process is wrapped in a no_grad context to reduce memory
            # consumption and improve performance.
            with torch.no_grad():
                result = self.pipeline(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                )
            
            if not result.images or len(result.images) == 0:
                raise RuntimeError("Image generation pipeline returned no images.")

            image = result.images[0]
            logger.info("Successfully generated image.")
            return image
        except Exception as e:
            logger.error(f"Image generation failed for prompt '{prompt[:100]}...': {e}")
            # Re-raise the exception to be handled by the calling service layer
            raise


if __name__ == '__main__':
    # This block serves as a simple test and demonstration of the ImageGenerator class.
    # It will only run when the script is executed directly, not when imported.
    # To run this, you need to have the required libraries installed:
    # pip install torch diffusers transformers accelerate safetensors
    print("--- Image Generator Self-Test ---")
    try:
        if not torch.cuda.is_available():
            print("\nWARNING: No CUDA-enabled GPU found. Using CPU. This will be very slow.")
            print("Generation may take several minutes.\n")

        # Instantiate the generator
        generator = ImageGenerator()

        # Define a test prompt relevant to the project's theme
        test_prompt = (
            "A sleek, futuristic digital art piece representing the intersection of "
            "artificial intelligence and global finance. Abstract data streams and "
            "neural network patterns flow around a stylized, minimalist bank icon. "
            "Dominant colors are deep blue, silver, and glowing white. "
            "Professional, clean, high-tech aesthetic, cinematic lighting."
        )

        print(f"Generating test image with prompt: '{test_prompt}'")
        generated_image = generator.generate_image(prompt=test_prompt)

        # Save the image to a file for inspection
        output_filename = "test_article_header.png"
        generated_image.save(output_filename)
        print(f"\nSUCCESS: Image saved to '{os.path.abspath(output_filename)}'")

    except RuntimeError as e:
        print(f"\nERROR: A runtime error occurred. {e}")
        print("Please ensure you have PyTorch, diffusers, and other dependencies installed.")
        print("For GPU support, make sure you have a compatible CUDA version and drivers.")
    except Exception as e:
        print(f"\nAn unexpected error occurred during the test: {e}")