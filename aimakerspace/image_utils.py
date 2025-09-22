"""
Image processing utilities for the aimakerspace library.
Handles image validation, processing, and preparation for AI model consumption.
Uses only built-in Python libraries.
"""

import os
import base64
from typing import Optional, Tuple
import io


class ImageProcessor:
    """Handles image processing and validation for AI model consumption using built-in libraries."""
    
    # Supported image formats
    SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg']
    SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg']
    
    # Maximum file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
    
    def __init__(self):
        """Initialize the image processor."""
        pass
    
    def validate_image(self, file_path: str) -> Tuple[bool, str]:
        """
        Validate an image file for format and size using built-in libraries.
        
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
            
            # Check file extension
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext not in self.SUPPORTED_EXTENSIONS:
                return False, f"Unsupported image format: {file_ext}. Only JPG/JPEG are supported."
            
            # Basic validation by reading file header
            with open(file_path, 'rb') as f:
                header = f.read(4)
                # Check for JPEG magic numbers
                if not (header[0] == 0xFF and header[1] == 0xD8):
                    return False, "Invalid JPEG file format"
                
            return True, ""
            
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def process_image(self, file_path: str) -> Optional[str]:
        """
        Process an image file and return base64 encoded string.
        For simplicity, we'll just read the file and encode it directly.
        
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
            
            # Read the image file and encode to base64
            with open(file_path, 'rb') as f:
                image_data = f.read()
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                return image_base64
                
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return None
    
    def get_image_info(self, file_path: str) -> Optional[dict]:
        """
        Get basic image information without external libraries.
        
        Args:
            file_path: Path to the image file
            
        Returns:
            Dictionary with image info or None if error
        """
        try:
            file_size = os.path.getsize(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()
            
            return {
                'format': file_ext.upper().replace('.', ''),
                'file_size': file_size,
                'filename': os.path.basename(file_path)
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
