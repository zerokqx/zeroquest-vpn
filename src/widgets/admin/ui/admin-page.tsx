'use client';

import {
  Admin,
  BooleanField,
  BooleanInput,
  Create,
  Datagrid,
  DataProvider,
  DateField,
  DateTimeInput,
  DeleteButton,
  Edit,
  EditButton,
  List,
  NumberField,
  NumberInput,
  ReferenceArrayInput,
  ReferenceInput,
  Resource,
  SelectArrayInput,
  SelectInput,
  SimpleForm,
  TextArrayInput,
  TextField,
  TextInput,
  maxValue,
  minValue,
  required,
  type RaRecord,
} from 'react-admin';
import { Card, CardContent, Typography } from '@mui/material';
import type { Inbound } from '@/entities/inbound/model/types';
import type { Plan } from '@/entities/plan/model/types';
import type { PromoCode } from '@/entities/promo-code/model/types';

type AdminResourceName = 'inbounds' | 'plans' | 'promo-codes';

type PlanRecord = Plan & {
  trafficLimitGb: number | null;
};

type AdminRecord = (Inbound | PlanRecord | PromoCode) & RaRecord;

const BYTES_IN_GIGABYTE = 1024 ** 3;

const resourceConfig = {
  inbounds: {
    itemKey: 'inbound',
    listKey: 'inbounds',
    path: '/api/admin/inbounds',
  },
  plans: {
    itemKey: 'plan',
    listKey: 'plans',
    path: '/api/admin/plans',
  },
  'promo-codes': {
    itemKey: 'promoCode',
    listKey: 'promoCodes',
    path: '/api/admin/promo-codes',
  },
} as const;

const isAdminResource = (resource: string): resource is AdminResourceName =>
  resource in resourceConfig;

const toError = (message: string, status: number, body: unknown): Error & {
  body: unknown;
  status: number;
} => {
  const error = new Error(message) as Error & {
    body: unknown;
    status: number;
  };

  error.body = body;
  error.status = status;

  return error;
};

const requestJson = async <T,>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    throw toError(
      typeof payload?.error === 'string' ? payload.error : 'Request failed',
      response.status,
      payload
    );
  }

  return payload as T;
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toNullableText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

const toPlanRecord = (plan: Plan): PlanRecord => ({
  ...plan,
  trafficLimitGb:
    plan.trafficLimitBytes === null
      ? null
      : Math.round(plan.trafficLimitBytes / BYTES_IN_GIGABYTE),
});

const toPlanPayload = (record: Partial<PlanRecord>) => ({
  allowsCustomTraffic: Boolean(record.allowsCustomTraffic),
  badge: toNullableText(record.badge),
  ctaText: String(record.ctaText ?? '').trim(),
  currency: String(record.currency ?? 'RUB').trim().toUpperCase() || 'RUB',
  customPricePerGbRub: Boolean(record.allowsCustomTraffic)
    ? toNullableNumber(record.customPricePerGbRub)
    : null,
  customTrafficMaxGb: Boolean(record.allowsCustomTraffic)
    ? toNullableNumber(record.customTrafficMaxGb)
    : null,
  customTrafficMinGb: Boolean(record.allowsCustomTraffic)
    ? toNullableNumber(record.customTrafficMinGb)
    : null,
  description: String(record.description ?? '').trim(),
  durationDays: toNullableNumber(record.durationDays) ?? 30,
  features: Array.isArray(record.features)
    ? record.features
        .map((feature) => String(feature).trim())
        .filter(Boolean)
    : [],
  highlight: toNullableText(record.highlight),
  inboundId: toNullableNumber(record.inboundId) ?? 1,
  isActive: Boolean(record.isActive),
  isFeatured: Boolean(record.isFeatured),
  priceRub: toNullableNumber(record.priceRub) ?? 0,
  slug: String(record.slug ?? '').trim(),
  speedLimitMbps: toNullableNumber(record.speedLimitMbps),
  title: String(record.title ?? '').trim(),
  trafficLimitGb: toNullableNumber(record.trafficLimitGb),
});

const toInboundPayload = (record: Partial<Inbound>) => ({
  id: toNullableNumber(record.id) ?? 0,
  isActive: Boolean(record.isActive),
  name: String(record.name ?? '').trim(),
  type: String(record.type ?? '').trim(),
  value: String(record.value ?? '').trim(),
});

const toPromoPayload = (record: Partial<PromoCode>) => ({
  appliesToPlanIds: Array.isArray(record.appliesToPlanIds)
    ? record.appliesToPlanIds
        .map((planId) => String(planId).trim())
        .filter(Boolean)
    : [],
  code: String(record.code ?? '').trim().toUpperCase(),
  description: String(record.description ?? '').trim(),
  discountType: record.discountType === 'fixed' ? 'fixed' : 'percent',
  discountValue: toNullableNumber(record.discountValue) ?? 0,
  expiresAt:
    typeof record.expiresAt === 'string' && record.expiresAt.trim() !== ''
      ? new Date(record.expiresAt).toISOString()
      : null,
  isActive: Boolean(record.isActive),
  usageLimit: toNullableNumber(record.usageLimit),
});

const compareValues = (
  left: unknown,
  right: unknown,
  order: 'ASC' | 'DESC'
): number => {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return 1;
  }

  if (right === null || right === undefined) {
    return -1;
  }

  const normalizedLeft =
    typeof left === 'string' || typeof left === 'number' || typeof left === 'boolean'
      ? left
      : JSON.stringify(left);
  const normalizedRight =
    typeof right === 'string' || typeof right === 'number' || typeof right === 'boolean'
      ? right
      : JSON.stringify(right);

  const result =
    normalizedLeft > normalizedRight
      ? 1
      : normalizedLeft < normalizedRight
        ? -1
        : 0;

  return order === 'ASC' ? result : result * -1;
};

const getListPayload = async (resource: AdminResourceName) => {
  const config = resourceConfig[resource];
  const payload = await requestJson<Record<string, unknown>>(config.path);

  return payload[config.listKey] as unknown[];
};

const getItemPayload = async (resource: AdminResourceName, id: string) => {
  const config = resourceConfig[resource];
  const payload = await requestJson<Record<string, unknown>>(
    `${config.path}/${id}`
  );

  return payload[config.itemKey];
};

const mapRecord = (resource: AdminResourceName, payload: unknown): AdminRecord => {
  if (resource === 'plans') {
    return toPlanRecord(payload as Plan) as AdminRecord;
  }

  return payload as AdminRecord;
};

const adminDataProvider = {
  getList: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const allRecords = (await getListPayload(resource)).map((record) =>
      mapRecord(resource, record)
    );
    const sort = params.sort ?? { field: 'id', order: 'ASC' as const };
    const pagination = params.pagination ?? { page: 1, perPage: allRecords.length || 25 };
    const sortedRecords = [...allRecords].sort((left, right) =>
      compareValues(
        (left as Record<string, unknown>)[sort.field],
        (right as Record<string, unknown>)[sort.field],
        sort.order
      )
    );
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;

    return {
      data: sortedRecords.slice(start, end) as AdminRecord[],
      total: sortedRecords.length,
    };
  },
  getOne: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    return {
      data: mapRecord(resource, await getItemPayload(resource, String(params.id))) as AdminRecord,
    };
  },
  getMany: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const allRecords = (await getListPayload(resource)).map((record) =>
      mapRecord(resource, record)
    );

    return {
      data: allRecords.filter((record) => params.ids.includes(record.id)) as AdminRecord[],
    };
  },
  getManyReference: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const allRecords = (await getListPayload(resource)).map((record) =>
      mapRecord(resource, record)
    );
    const filtered = allRecords.filter((record) => {
      const candidate = (record as Record<string, unknown>)[params.target];

      if (Array.isArray(candidate)) {
        return candidate.includes(params.id);
      }

      return candidate === params.id;
    });

    return {
      data: filtered as AdminRecord[],
      total: filtered.length,
    };
  },
  create: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const payload =
      resource === 'plans'
        ? toPlanPayload(params.data as Partial<PlanRecord>)
        : resource === 'inbounds'
          ? toInboundPayload(params.data as Partial<Inbound>)
          : toPromoPayload(params.data as Partial<PromoCode>);
    const response = await requestJson<Record<string, unknown>>(resourceConfig[resource].path, {
      body: JSON.stringify(payload),
      method: 'POST',
    });

    return {
      data: mapRecord(resource, response[resourceConfig[resource].itemKey]) as AdminRecord,
    };
  },
  update: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const payload =
      resource === 'plans'
        ? toPlanPayload(params.data as Partial<PlanRecord>)
        : resource === 'inbounds'
          ? toInboundPayload(params.data as Partial<Inbound>)
          : toPromoPayload(params.data as Partial<PromoCode>);
    const response = await requestJson<Record<string, unknown>>(
      `${resourceConfig[resource].path}/${params.id}`,
      {
        body: JSON.stringify(payload),
        method: 'PATCH',
      }
    );

    return {
      data: mapRecord(resource, response[resourceConfig[resource].itemKey]) as AdminRecord,
    };
  },
  updateMany: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const ids = await Promise.all(
      params.ids.map(async (id) => {
        await adminDataProvider.update(resource, {
          id,
          data: params.data,
          previousData: params.data,
        });

        return id;
      })
    );

    return { data: ids };
  },
  delete: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    await requestJson<Record<string, unknown>>(
      `${resourceConfig[resource].path}/${params.id}`,
      {
        method: 'DELETE',
      }
    );

    return {
      data: params.previousData,
    };
  },
  deleteMany: async (resource, params) => {
    if (!isAdminResource(resource)) {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const ids = await Promise.all(
      params.ids.map(async (id) => {
        await (adminDataProvider as DataProvider).delete(
          resource,
          {
            id,
            previousData: { id },
          } as never
        );

        return id;
      })
    );

    return { data: ids };
  },
} as DataProvider;

const nullableDateFormat = (value: string | null | undefined): string =>
  value ? value.slice(0, 16) : '';

const AdminDashboard = () => (
  <Card>
    <CardContent>
      <Typography gutterBottom variant="h5">
        ZeroQuest Admin
      </Typography>
      <Typography color="text.secondary" variant="body2">
        Управление inbound&apos;ами, тарифами и промокодами поверх серверных API.
      </Typography>
    </CardContent>
  </Card>
);

const InboundList = () => (
  <List resource="inbounds" sort={{ field: 'updatedAt', order: 'DESC' }}>
    <Datagrid bulkActionButtons={false} rowClick="edit">
      <NumberField source="id" label="ID" />
      <TextField source="name" label="Название" />
      <TextField source="type" label="Тип" />
      <TextField source="value" label="Value" />
      <BooleanField source="isActive" label="Активен" />
      <DateField source="updatedAt" label="Обновлён" showTime />
      <EditButton />
      <DeleteButton mutationMode="pessimistic" />
    </Datagrid>
  </List>
);

const InboundForm = () => (
  <SimpleForm>
    <NumberInput source="id" label="Inbound ID" validate={[required(), minValue(1)]} />
    <TextInput source="name" label="Название" validate={[required()]} />
    <TextInput source="type" label="Тип" validate={[required()]} />
    <TextInput source="value" label="Value" validate={[required()]} />
    <BooleanInput source="isActive" label="Активен" />
  </SimpleForm>
);

const InboundEdit = () => (
  <Edit mutationMode="pessimistic" resource="inbounds">
    <InboundForm />
  </Edit>
);

const InboundCreate = () => (
  <Create resource="inbounds">
    <InboundForm />
  </Create>
);

const PlanList = () => (
  <List resource="plans" sort={{ field: 'updatedAt', order: 'DESC' }}>
    <Datagrid bulkActionButtons={false} rowClick="edit">
      <TextField source="title" label="Название" />
      <TextField source="slug" label="Slug" />
      <NumberField source="priceRub" label="Цена, ₽" />
      <NumberField source="durationDays" label="Дней" />
      <NumberField source="inboundId" label="Inbound" />
      <BooleanField source="allowsCustomTraffic" label="Кастом" />
      <BooleanField source="isActive" label="Активен" />
      <BooleanField source="isFeatured" label="Лучший" />
      <DateField source="updatedAt" label="Обновлён" showTime />
      <EditButton />
      <DeleteButton mutationMode="pessimistic" />
    </Datagrid>
  </List>
);

const PlanForm = () => (
  <SimpleForm>
    <TextInput source="title" label="Название" validate={[required()]} />
    <TextInput source="slug" label="Slug" validate={[required()]} />
    <TextInput source="description" label="Описание" multiline validate={[required()]} />
    <TextInput source="ctaText" label="Текст кнопки" validate={[required()]} />
    <TextInput source="badge" label="Badge" format={(value) => value ?? ''} parse={toNullableText} />
    <TextInput
      source="highlight"
      label="Короткий акцент"
      format={(value) => value ?? ''}
      parse={toNullableText}
    />
    <SelectInput
      source="currency"
      label="Валюта"
      choices={[{ id: 'RUB', name: 'RUB' }]}
      validate={[required()]}
    />
    <NumberInput source="priceRub" label="Цена, ₽" validate={[required(), minValue(0)]} />
    <NumberInput source="durationDays" label="Срок, дней" validate={[required(), minValue(1)]} />
    <ReferenceInput source="inboundId" reference="inbounds" label="Inbound">
      <SelectInput optionText="name" validate={[required()]} />
    </ReferenceInput>
    <NumberInput
      source="trafficLimitGb"
      label="Лимит трафика, GB"
      format={(value) => value ?? ''}
      parse={toNullableNumber}
    />
    <NumberInput
      source="speedLimitMbps"
      label="Скорость, Мбит/с"
      format={(value) => value ?? ''}
      parse={toNullableNumber}
    />
    <BooleanInput source="isActive" label="Активен" />
    <BooleanInput source="isFeatured" label="Лучший выбор" />
    <BooleanInput source="allowsCustomTraffic" label="План с кастомным объёмом" />
    <NumberInput
      source="customPricePerGbRub"
      label="Цена за 1 GB, ₽"
      format={(value) => value ?? ''}
      parse={toNullableNumber}
    />
    <NumberInput
      source="customTrafficMinGb"
      label="Минимум GB"
      format={(value) => value ?? ''}
      parse={toNullableNumber}
    />
    <NumberInput
      source="customTrafficMaxGb"
      label="Максимум GB"
      format={(value) => value ?? ''}
      parse={toNullableNumber}
    />
    <TextArrayInput source="features" label="Преимущества" validate={[required()]} />
  </SimpleForm>
);

const PlanEdit = () => (
  <Edit mutationMode="pessimistic" resource="plans">
    <PlanForm />
  </Edit>
);

const PlanCreate = () => (
  <Create resource="plans">
    <PlanForm />
  </Create>
);

const PromoCodeList = () => (
  <List resource="promo-codes" sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid bulkActionButtons={false} rowClick="edit">
      <TextField source="code" label="Код" />
      <TextField source="description" label="Описание" />
      <TextField source="discountType" label="Тип" />
      <NumberField source="discountValue" label="Скидка" />
      <NumberField source="usedCount" label="Исп." />
      <NumberField source="usageLimit" label="Лимит" />
      <BooleanField source="isActive" label="Активен" />
      <DateField source="expiresAt" label="Действует до" showTime />
      <EditButton />
      <DeleteButton mutationMode="pessimistic" />
    </Datagrid>
  </List>
);

const PromoCodeForm = () => (
  <SimpleForm>
    <TextInput source="code" label="Код" validate={[required()]} />
    <TextInput source="description" label="Описание" multiline validate={[required()]} />
    <SelectInput
      source="discountType"
      label="Тип скидки"
      choices={[
        { id: 'percent', name: 'Процент' },
        { id: 'fixed', name: 'Фиксированная сумма' },
      ]}
      validate={[required()]}
    />
    <NumberInput
      source="discountValue"
      label="Размер скидки"
      validate={[required(), minValue(1), maxValue(1_000_000)]}
    />
    <NumberInput
      source="usageLimit"
      label="Лимит использований"
      format={(value) => value ?? ''}
      parse={toNullableNumber}
    />
    <DateTimeInput
      source="expiresAt"
      label="Действует до"
      format={nullableDateFormat}
      parse={(value) => (typeof value === 'string' && value ? new Date(value).toISOString() : null)}
    />
    <ReferenceArrayInput
      source="appliesToPlanIds"
      reference="plans"
      label="Доступные тарифы"
    >
      <SelectArrayInput optionText="title" />
    </ReferenceArrayInput>
    <BooleanInput source="isActive" label="Активен" />
  </SimpleForm>
);

const PromoCodeEdit = () => (
  <Edit mutationMode="pessimistic" resource="promo-codes">
    <PromoCodeForm />
  </Edit>
);

const PromoCodeCreate = () => (
  <Create resource="promo-codes">
    <PromoCodeForm />
  </Create>
);

export function AdminPage() {
  return (
    <Admin dashboard={AdminDashboard} dataProvider={adminDataProvider}>
      <Resource
        create={InboundCreate}
        edit={InboundEdit}
        list={InboundList}
        name="inbounds"
        options={{ label: 'Inbounds' }}
      />
      <Resource
        create={PlanCreate}
        edit={PlanEdit}
        list={PlanList}
        name="plans"
        options={{ label: 'Тарифы' }}
      />
      <Resource
        create={PromoCodeCreate}
        edit={PromoCodeEdit}
        list={PromoCodeList}
        name="promo-codes"
        options={{ label: 'Промокоды' }}
      />
    </Admin>
  );
}
