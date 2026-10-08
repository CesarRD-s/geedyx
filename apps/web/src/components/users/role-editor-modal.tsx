'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { PermissionOption, RoleSummary } from '@geedyx/contracts';
import { Modal } from '../feedback/feedback';
import { Input } from '../forms/input';
import { cn } from '../../lib/cn';

type RoleEditorModalProps = {
  error: string;
  initialRole: RoleSummary | null;
  onClose: () => void;
  onSubmit: (payload: {
    description: string;
    name: string;
    permissionCodes: string[];
  }) => void;
  open: boolean;
  permissions: PermissionOption[];
  saving: boolean;
};

export function RoleEditorModal({
  error,
  initialRole,
  onClose,
  onSubmit,
  open,
  permissions,
  saving,
}: RoleEditorModalProps) {
  const [name, setName] = useState(initialRole?.name ?? '');
  const [description, setDescription] = useState(initialRole?.description ?? '');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    () =>
      initialRole?.permissions.filter((code) =>
        permissions.some(
          (permission) => permission.assignable && permission.code === code,
        ),
      ) ?? [],
  );
  const [formError, setFormError] = useState('');
  const availablePermissions = useMemo(
    () => permissions.filter((permission) => permission.assignable),
    [permissions],
  );
  const modules = useMemo(() => {
    const grouped = new Map<string, PermissionOption[]>();
    for (const permission of availablePermissions) {
      const current = grouped.get(permission.moduleKey) ?? [];
      grouped.set(permission.moduleKey, [...current, permission]);
    }
    return [...grouped.entries()].map(([key, modulePermissions]) => ({
      key,
      label: modulePermissions[0]?.moduleLabel ?? key,
      permissions: modulePermissions,
    }));
  }, [availablePermissions]);

  const togglePermission = (code: string, checked: boolean) => {
    setSelectedCodes((current) =>
      checked
        ? [...new Set([...current, code])]
        : current.filter((selectedCode) => selectedCode !== code),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (name.trim().length < 2) {
      setFormError('Escribe un nombre para el perfil.');
      return;
    }
    if (description.trim().length < 3) {
      setFormError('Describe brevemente para qué se usará este perfil.');
      return;
    }
    if (selectedCodes.length === 0) {
      setFormError('Selecciona al menos una acción.');
      return;
    }
    onSubmit({
      description: description.trim(),
      name: name.trim(),
      permissionCodes: selectedCodes,
    });
  };

  return (
    <Modal
      description="Elige qué acciones podrá realizar este perfil en toda la empresa."
      footer={
        <>
          <button
            className={cn([
              'rounded-full border border-border-strong px-3 py-2 text-sm font-medium',
              'transition hover:bg-surface-subtle',
            ])}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={cn([
              'rounded-full bg-accent px-3 py-2 text-sm font-medium text-accent-foreground',
              'transition hover:bg-accent-hover disabled:cursor-not-allowed',
              'disabled:opacity-60',
            ])}
            disabled={saving}
            form="access-profile-form"
            type="submit"
          >
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title={initialRole ? 'Editar perfil de acceso' : 'Crear perfil de acceso'}
    >
      <form
        className={cn(['space-y-5'])}
        id="access-profile-form"
        onSubmit={handleSubmit}
      >
        <div className={cn(['grid gap-4 sm:grid-cols-2'])}>
          <label className={cn(['block space-y-1.5 text-sm font-medium'])}>
            Nombre del perfil
            <Input
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className={cn(['block space-y-1.5 text-sm font-medium'])}>
            Para qué se usa
            <Input
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
        </div>

        <div
          className={cn([
            'rounded-xl border border-border bg-surface-subtle p-3 text-sm',
            'text-secondary',
          ])}
        >
          Este perfil aplica a toda la empresa. Si se asignan varios perfiles a una
          cuenta, sus accesos se suman.
        </div>

        <div className={cn(['space-y-4'])}>
          <h3 className={cn(['text-sm font-semibold'])}>Acciones disponibles</h3>
          {modules.map((module) => (
            <fieldset
              className={cn(['space-y-2 rounded-xl border border-border p-3'])}
              key={module.key}
            >
              <legend className={cn(['px-1 text-sm font-medium'])}>
                {module.label}
              </legend>
              {module.permissions.map((permission) => (
                <label
                  className={cn([
                    'flex items-start gap-3 rounded-lg px-2 py-2',
                    'hover:bg-surface-subtle',
                  ])}
                  key={permission.code}
                >
                  <input
                    checked={selectedCodes.includes(permission.code)}
                    className={cn(['mt-0.5 h-4 w-4 accent-accent'])}
                    onChange={(event) =>
                      togglePermission(permission.code, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span className={cn(['space-y-0.5'])}>
                    <span className={cn(['block text-sm font-medium'])}>
                      {permission.label}
                    </span>
                    <span className={cn(['block text-xs text-secondary'])}>
                      {permission.description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        {formError ? (
          <p className={cn(['text-sm text-danger'])} role="alert">
            {formError}
          </p>
        ) : null}
        {error ? (
          <p className={cn(['text-sm text-danger'])} role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
