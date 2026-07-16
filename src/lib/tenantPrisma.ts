import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Storage for manual overrides (e.g. background tasks, cron, signup, seeding)
export const tenantLocalStorage = new AsyncLocalStorage<{ orgId: string }>();

// Helper to run code with a specific tenant override
export async function withTenantContext<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  return tenantLocalStorage.run({ orgId }, fn);
}

// Scoped models that must be isolated by organization
const SCOPED_MODELS = [
  'Project',
  'User',
  'Company',
  'Team',
  'Worker',
  'Vendor',
  'BankAccount',
  'Lender',
  'Investor',
  'CustomTemplate',
  'BoardColumn',
  'OverheadExpense',
  'SalaryRun',
];

export function getTenantScopedClient(baseClient: PrismaClient) {
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // If the model is not in the scoped list, execute the query normally
          if (!SCOPED_MODELS.includes(model)) {
            return query(args);
          }

          // 1. Check for manual override context
          const override = tenantLocalStorage.getStore();
          let orgId = override?.orgId;

          // 2. If no override, try to resolve from active NextAuth session
          if (!orgId) {
            try {
              const session = await getServerSession(authOptions);
              orgId = session?.user?.orgId;
            } catch (err) {
              // In some static render context, getServerSession might throw.
              // We catch and handle below.
            }
          }

          // 3. Handle system/bypass context (e.g., signup, db seed)
          if (orgId === 'system') {
            return query(args);
          }

          // 4. Fail closed: throw if orgId cannot be resolved
          if (!orgId) {
            // For safety, during server-side builds or static generation, some files might instantiate queries.
            // We only throw if it's an actual database execution that expects scope.
            throw new Error(
              `Unauthorized: Tenant context (orgId) is missing for database query on model "${model}". Fail closed.`
            );
          }

          // Inject orgId into operations
          const typedArgs = args as any;

          if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            typedArgs.where = typedArgs.where || {};
            typedArgs.where.orgId = orgId;
          } else if (operation === 'findUnique') {
            // findUnique does not support non-unique fields (like orgId) in where unless they are part of a composite unique index.
            // We transform findUnique into findFirst with orgId filter injected.
            typedArgs.where = typedArgs.where || {};
            typedArgs.where.orgId = orgId;
            return (baseClient[model as any] as any).findFirst(typedArgs);
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            typedArgs.where = typedArgs.where || {};
            typedArgs.where.orgId = orgId;
          } else if (['create', 'createMany'].includes(operation)) {
            if (operation === 'create') {
              typedArgs.data = typedArgs.data || {};
              typedArgs.data.orgId = orgId;
            } else if (operation === 'createMany') {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data.forEach((item: any) => {
                  item.orgId = orgId;
                });
              } else {
                typedArgs.data = typedArgs.data || {};
                typedArgs.data.orgId = orgId;
              }
            }
          } else if (operation === 'upsert') {
            typedArgs.create = typedArgs.create || {};
            typedArgs.create.orgId = orgId;
            typedArgs.update = typedArgs.update || {};
            typedArgs.update.orgId = orgId;
            typedArgs.where = typedArgs.where || {};
            typedArgs.where.orgId = orgId;
          }

          return query(args);
        },
      },
    },
  });
}
