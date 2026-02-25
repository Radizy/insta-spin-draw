-- Script: Migration para converter UUIDs de Bags em Nomes no Histórico
-- Arquivo: scripts/migrate_bag_names.sql
-- Motivo: O Roteirista estava salvando o ID da Bag invés do Nome amigável.
-- Este script pega todas as entregas já cadastradas que têm um UUID como "tipo_bag"
-- e substitui pelo "nome" daquela Bag na tabela "franquia_bag_tipos".

UPDATE historico_entregas h
SET tipo_bag = fbt.nome
FROM franquia_bag_tipos fbt
WHERE h.tipo_bag = fbt.id::text;
