import logging
from supabase import create_client, Client
from .config import settings

logger = logging.getLogger(__name__)


def _create_admin_client() -> Client:
    """
    Admin / service-role client.
    Bypasses Row Level Security — use ONLY for server-side operations:
    password reset emails, admin queries, etc.
    Never expose this key to the frontend.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError(
            "Cannot create Supabase admin client: "
            "SUPABASE_URL or SUPABASE_SECRET_KEY is missing. "
            "Check your backend/.env file."
        )
    logger.info("[Supabase] Admin client created (service-role key configured)")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)


def _create_public_client() -> Client:
    """
    Publishable / anon-key client.
    Respects Row Level Security — use for user-facing auth:
    sign_up, sign_in_with_password, etc.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        raise RuntimeError(
            "Cannot create Supabase public client: "
            "SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing. "
            "Check your backend/.env file."
        )
    logger.info(
        "[SUPABASE] Creating public client: url=%s, key=%s...%s",
        settings.SUPABASE_URL,
        settings.SUPABASE_PUBLISHABLE_KEY[:16],
        settings.SUPABASE_PUBLISHABLE_KEY[-4:],
    )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)


def create_fresh_public_client() -> Client:
    """
    Create a NEW public client instance.
    Use this for operations that need their own session state (e.g., password reset)
    to avoid mutating the shared singleton's session.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)


# Singletons — created once at startup
supabase_admin: Client = _create_admin_client()
supabase_client: Client = _create_public_client()
