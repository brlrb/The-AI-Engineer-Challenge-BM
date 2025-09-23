import os
from typing import Any, AsyncIterator, Iterable, List, MutableMapping

from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
from together import Together, AsyncTogether

load_dotenv()

ChatMessage = MutableMapping[str, Any]


class ChatOpenAI:
    """Thin wrapper around the OpenAI chat completion APIs."""

    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.model_name = model_name
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if self.openai_api_key is None:
            raise ValueError("OPENAI_API_KEY is not set")

        self._client = OpenAI()
        self._async_client = AsyncOpenAI()

    def run(
        self,
        messages: Iterable[ChatMessage],
        text_only: bool = True,
        **kwargs: Any,
    ) -> Any:
        """Execute a chat completion request.

        ``messages`` must be an iterable of ``{"role": ..., "content": ...}``
        dictionaries. When ``text_only`` is ``True`` (the default) only the
        completion text is returned; otherwise the full response object is
        provided.
        """

        message_list = self._coerce_messages(messages)
        response = self._client.chat.completions.create(
            model=self.model_name, messages=message_list, **kwargs
        )

        if text_only:
            return response.choices[0].message.content

        return response

    async def astream(
        self, messages: Iterable[ChatMessage], **kwargs: Any
    ) -> AsyncIterator[str]:
        """Yield streaming completion chunks as they arrive from the API."""

        message_list = self._coerce_messages(messages)
        stream = await self._async_client.chat.completions.create(
            model=self.model_name, messages=message_list, stream=True, **kwargs
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content is not None:
                yield content

    def _coerce_messages(self, messages: Iterable[ChatMessage]) -> List[ChatMessage]:
        if isinstance(messages, list):
            return messages
        return list(messages)


class ChatTogetherAI:
    """Thin wrapper around the Together AI chat completion APIs."""

    def __init__(self, model_name: str = "meta-llama/Llama-3.1-8B-Instruct-Turbo"):
        self.model_name = model_name
        self.together_api_key = os.getenv("TOGETHER_API_KEY")
        if self.together_api_key is None:
            raise ValueError("TOGETHER_API_KEY is not set")

        self._client = Together()
        self._async_client = AsyncTogether()

    def run(
        self,
        messages: Iterable[ChatMessage],
        text_only: bool = True,
        **kwargs: Any,
    ) -> Any:
        """Execute a chat completion request.

        ``messages`` must be an iterable of ``{"role": ..., "content": ...}``
        dictionaries. When ``text_only`` is ``True`` (the default) only the
        completion text is returned; otherwise the full response object is
        provided.
        """

        message_list = self._coerce_messages(messages)
        response = self._client.chat.completions.create(
            model=self.model_name, messages=message_list, **kwargs
        )

        if text_only:
            return response.choices[0].message.content

        return response

    async def astream(
        self, messages: Iterable[ChatMessage], **kwargs: Any
    ) -> AsyncIterator[str]:
        """Yield streaming completion chunks as they arrive from the API."""

        message_list = self._coerce_messages(messages)
        stream = await self._async_client.chat.completions.create(
            model=self.model_name, messages=message_list, stream=True, **kwargs
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content is not None:
                yield content

    def _coerce_messages(self, messages: Iterable[ChatMessage]) -> List[ChatMessage]:
        if isinstance(messages, list):
            return messages
        return list(messages)


def create_chat_model(provider: str = "openai", model_name: str = None):
    """Factory function to create appropriate chat model based on provider.
    
    Args:
        provider: Either "openai" or "together"
        model_name: Optional model name override
    
    Returns:
        ChatOpenAI or ChatTogetherAI instance
    """
    if provider.lower() == "together":
        # Default Together AI model if none specified
        if model_name is None:
            model_name = "meta-llama/Llama-3.1-8B-Instruct-Turbo"
        return ChatTogetherAI(model_name=model_name)
    else:
        # Default OpenAI model if none specified
        if model_name is None:
            model_name = "gpt-4o-mini"
        return ChatOpenAI(model_name=model_name)