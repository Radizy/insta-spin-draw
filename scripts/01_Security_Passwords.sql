-- ==============================================================================
-- 🛡️ SCRIPT DE SEGURANÇA 1: SENHAS EM TEXTO PLANO
-- Este script habilita a criptografia automática de senhas no banco.
-- NENHUMA alteração é necessária no frontend (React). Apenas rodar isto no Supabase.
-- ==============================================================================

-- 1. Ativamos a extensão pgcrypto, que é nativa e segura para gerar Hashes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criamos uma função no banco de dados que vai olhar a senha antes de gravar
CREATE OR REPLACE FUNCTION hash_password_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o campo password_hash não for nulo e não estiver já usando o formato do bcrypt (começa com $2)
    IF NEW.password_hash IS NOT NULL AND NEW.password_hash NOT LIKE '$2a$%' AND NEW.password_hash NOT LIKE '$2b$%' THEN
        -- Transforma a senha "1234" vinda do frontend em um Hash embaraçado e seguro
        NEW.password_hash = crypt(NEW.password_hash, gen_salt('bf'));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Atrelamos essa função à tabela system_users (sempre que INSERIR ou ATUALIZAR)
DROP TRIGGER IF EXISTS encrypt_password_on_insert_update ON public.system_users;

CREATE TRIGGER encrypt_password_on_insert_update
BEFORE INSERT OR UPDATE OF password_hash ON public.system_users
FOR EACH ROW
EXECUTE FUNCTION hash_password_trigger();

-- ==============================================================================
-- Fim do Script. Pode rodar no SQL Editor do Supabase!
-- ==============================================================================
