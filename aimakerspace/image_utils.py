"""
Image processing utilities for the aimakerspace library.
Handles image validation, processing, and preparation for AI model consumption.
"""

import os
import base64
from typing import Optional, Tuple
from PIL import Image
import io


class ImageProcessor:
    """Handles image processing and validation for AI model consumption."""
    
    # Supported image formats
    SUPPORTED_FORMATS = ['JPEG', 'JPG']
    SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg']
    
    # Maximum file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
    
    def __init__(self):
        """Initialize the image processor."""
        pass
    
    def validate_image(self, file_path: str) -> Tuple[bool, str]:
        """
        Validate an image file for format and size.
        
        Args:
            file_path: Path to the image file
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size > self.MAX_FILE_SIZE:
                return False, f"File size ({file_size / (1024*1024):.2f}MB) exceeds maximum allowed size (10MB)"
            
            # Check if file exists
            if not os.path.exists(file_path):
                return False, "File does not exist"
            
            # Try to open and validate the image
            with Image.open(file_path) as img:
                # Check format
                if img.format not in self.SUPPORTED_FORMATS:
                    return False, f"Unsupported image format: {img.format}. Only JPEG/JPG are supported."
                
                # Check if image can be loaded properly
                img.verify()
                
            return True, ""
            
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def process_image(self, file_path: str) -> Optional[str]:
        """
        Process an image file and return base64 encoded string.
        
        Args:
            file_path: Path to the image file
            
        Returns:
            Base64 encoded image string or None if processing fails
        """
        try:
            # Validate the image first
            is_valid, error_msg = self.validate_image(file_path)
            if not is_valid:
                raise ValueError(error_msg)
            
            # Open and process the image
            with Image.open(file_path) as img:
                # Convert to RGB if necessary (handles RGBA, P, etc.)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize if too large (optional optimization)
                max_dimension = 2048
                if max(img.size) > max_dimension:
                    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                
                # Convert to base64
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85, optimize=True)
                buffer.seek(0)
                
                # Encode to base64
                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                return image_base64
                
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return None
    
    def get_image_info(self, file_path: str) -> Optional[dict]:
        """
        Get image information without processing.
        
        Args:
            file_path: Path to the image file
            
        Returns:
            Dictionary with image info or None if error
        """
        try:
            with Image.open(file_path) as img:
                return {
                    'format': img.format,
                    'mode': img.mode,
                    'size': img.size,
                    'width': img.width,
                    'height': img.height,
                    'file_size': os.path.getsize(file_path)
                }
        except Exception as e:
            print(f"Error getting image info: {str(e)}")
            return None


class ImageUploadHandler:
    """Handles image upload operations and validation."""
    
    def __init__(self):
        """Initialize the image upload handler."""
        self.processor = ImageProcessor()
    
    def handle_upload(self, file_content: bytes, filename: str) -> dict:
        """
        Handle image upload and processing.
        
        Args:
            file_content: Raw file content as bytes
            filename: Original filename
            
        Returns:
            Dictionary with upload result
        """
        try:
            # Create temporary file
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{filename.split('.')[-1]}") as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Validate the image
                is_valid, error_msg = self.processor.validate_image(temp_file_path)
                if not is_valid:
                    return {
                        'success': False,
                        'error': error_msg
                    }
                
                # Get image info
                image_info = self.processor.get_image_info(temp_file_path)
                if not image_info:
                    return {
                        'success': False,
                        'error': 'Could not read image information'
                    }
                
                # Process the image
                image_base64 = self.processor.process_image(temp_file_path)
                if not image_base64:
                    return {
                        'success': False,
                        'error': 'Failed to process image'
                    }
                
                return {
                    'success': True,
                    'image_base64': image_base64,
                    'image_info': image_info,
                    'filename': filename
                }
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Upload failed: {str(e)}'
            }
