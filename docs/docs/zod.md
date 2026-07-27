# Zod

## Overview

Zod is a TypeScript-first schema declaration and validation library. It provides a simple, expressive way to define data schemas and validate data against those schemas, with automatic type inference for TypeScript.

## Latest Stable Version

**Version**: `3.23.0` (July 2026)

**Compatibility**:
- TypeScript: 4.5+, 5.0+
- Node.js: 14.0.0+, 16.0.0+, 18.0.0+, 20.0.0+
- Browsers: Modern browsers (Chrome, Firefox, Safari, Edge)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:
- TypeScript-first with automatic type inference
- Zero dependencies
- Comprehensive validation
- Custom error messages
- Async validation
- Schema composition
- Schema transformation
- Browser and Node.js support

## Core Concepts

- **Schemas**: Data structure definitions
- **Validation**: Checking data against schemas
- **Type Inference**: Automatic TypeScript type generation
- **Parsers**: Functions to parse and validate data
- **Refinements**: Custom validation logic
- **Transformations**: Data transformation during parsing
- **Composition**: Combining schemas
- **Error Handling**: Custom error messages

## Key Features

- **TypeScript-First**: Automatic type inference from schemas
- **Zero Dependencies**: Lightweight and fast
- **Comprehensive Validation**: Built-in validators for common types
- **Custom Error Messages**: Descriptive error messages
- **Async Validation**: Support for async validation
- **Schema Composition**: Combine and extend schemas
- **Data Transformation**: Transform data during validation
- **Cross-Platform**: Works in browser and Node.js

## Basic Usage

```bash
# Install Zod
npm install zod
```

## Installation

```bash
# Basic installation
npm install zod

# TypeScript types included by default
```

## Basic Schemas

### String Schema

```typescript
import { z } from 'zod'

const stringSchema = z.string()

stringSchema.parse('hello') // Success
stringSchema.parse(123) // Error: Expected string, received number
```

### Number Schema

```typescript
const numberSchema = z.number()

numberSchema.parse(42) // Success
numberSchema.parse('42') // Error: Expected number, received string
```

### Boolean Schema

```typescript
const booleanSchema = z.boolean()

booleanSchema.parse(true) // Success
booleanSchema.parse('true') // Error: Expected boolean, received string
```

### Object Schema

```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
})

const user = userSchema.parse({
  name: 'John',
  age: 30,
  email: 'john@example.com'
})
```

### Array Schema

```typescript
const arraySchema = z.array(z.string())

arraySchema.parse(['a', 'b', 'c']) // Success
arraySchema.parse([1, 2, 3]) // Error
```

## Advanced Schemas

### Optional Fields

```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  email: z.string().optional()
})
```

### Default Values

```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number().default(18),
  email: z.string().default('')
})
```

### Nullable Fields

```typescript
const schema = z.object({
  name: z.string().nullable()
})
```

### Union Types

```typescript
const stringOrNumber = z.union([z.string(), z.number()])

stringOrNumber.parse('hello') // Success
stringOrNumber.parse(42) // Success
stringOrNumber.parse(true) // Error
```

### Discriminated Unions

```typescript
const successSchema = z.object({
  status: z.literal('success'),
  data: z.string()
})

const errorSchema = z.object({
  status: z.literal('error'),
  error: z.string()
})

const resultSchema = z.discriminatedUnion('status', [successSchema, errorSchema])
```

## Validation

### Basic Validation

```typescript
const emailSchema = z.string().email()

emailSchema.parse('john@example.com') // Success
emailSchema.parse('invalid-email') // Error: Invalid email
```

### Custom Validation

```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
```

### Refinements

```typescript
const ageSchema = z.number().refine(
  (value) => value >= 18,
  'Must be 18 or older'
)

ageSchema.parse(25) // Success
ageSchema.parse(15) // Error: Must be 18 or older
```

### Async Validation

```typescript
const emailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email)
    return !exists
  },
  'Email already exists'
)
```

## Type Inference

### Infer TypeScript Types

```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
})

type User = z.infer<typeof userSchema>
// type User = {
//   name: string
//   age: number
//   email: string
// }
```

### Input vs Output Types

```typescript
const schema = z.string().transform((val) => val.toUpperCase())

type Input = z.input<typeof schema> // string
type Output = z.output<typeof schema> // string (uppercase)
```

## Error Handling

### Safe Parse

```typescript
const result = userSchema.safeParse({ name: 'John' })

if (result.success) {
  console.log(result.data)
} else {
  console.log(result.error.errors)
}
```

### Custom Error Messages

```typescript
const schema = z.string({
  required_error: 'Name is required',
  invalid_type_error: 'Name must be a string'
})
```

### Error Formatting

```typescript
const result = schema.safeParse(data)

if (!result.success) {
  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message
  }))
}
```

## Transformations

### String Transformations

```typescript
const schema = z.string()
  .trim()
  .toLowerCase()
  .transform((val) => val.replace(/\s+/g, '-'))

schema.parse('  Hello World  ') // 'hello-world'
```

### Number Transformations

```typescript
const schema = z.string()
  .transform((val) => Number(val))
  .pipe(z.number())

schema.parse('42') // 42
```

### Object Transformations

```typescript
const schema = z.object({
  firstName: z.string(),
  lastName: z.string()
}).transform((data) => ({
  fullName: `${data.firstName} ${data.lastName}`
}))

schema.parse({ firstName: 'John', lastName: 'Doe' })
// { fullName: 'John Doe' }
```

## Schema Composition

### Extend Schemas

```typescript
const baseSchema = z.object({
  id: z.string(),
  createdAt: z.date()
})

const userSchema = baseSchema.extend({
  name: z.string(),
  email: z.string().email()
})
```

### Merge Schemas

```typescript
const schema1 = z.object({ a: z.string() })
const schema2 = z.object({ b: z.number() })

const mergedSchema = schema1.merge(schema2)
```

### Partial Schemas

```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string()
})

const partialUserSchema = userSchema.partial()
// All fields are optional
```

### Required Schemas

```typescript
const partialSchema = z.object({
  name: z.string().optional(),
  age: z.number().optional()
})

const requiredSchema = partialSchema.required()
// All fields are required
```

## Advanced Patterns

### Schema Reuse

```typescript
const emailSchema = z.string().email()
const passwordSchema = z.string().min(8)

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})
```

### Conditional Validation

```typescript
const schema = z.object({
  type: z.enum(['individual', 'company']),
  companyName: z.string().optional()
}).refine(
  (data) => data.type === 'company' ? !!data.companyName : true,
  'Company name is required for company type'
)
```

### Recursive Schemas

```typescript
const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    subcategories: z.array(categorySchema).optional()
  })
)

type Category = z.infer<typeof categorySchema>
```

## Anti-Patterns

### 1. Not Using Type Inference

**BAD**:
```typescript
interface User {
  name: string
  age: number
}

const userSchema = z.object({
  name: z.string(),
  age: z.number()
})
```

**GOOD**:
```typescript
const userSchema = z.object({
  name: z.string(),
  age: z.number()
})

type User = z.infer<typeof userSchema>
```

**Why**: Type inference ensures types stay in sync with schemas.

### 2. Not Handling Errors

**BAD**:
```typescript
const user = userSchema.parse(data) // May throw
```

**GOOD**:
```typescript
const result = userSchema.safeParse(data)
if (!result.success) {
  // Handle errors
}
```

**Why**: Safe parse prevents runtime errors.

### 3. Not Using Custom Error Messages

**BAD**:
```typescript
const schema = z.string().min(8)
```

**GOOD**:
```typescript
const schema = z.string().min(8, 'Password must be at least 8 characters')
```

**Why**: Custom error messages improve user experience.

### 4. Not Validating at Boundaries

**BAD**:
```typescript
// No validation at API boundary
```

**GOOD**:
```typescript
// Validate all external data
const apiSchema = z.object({
  name: z.string(),
  email: z.string().email()
})
```

**Why**: Boundary validation prevents invalid data from entering the system.

## Performance Optimization

### 1. Reuse Schemas

```typescript
// Define schemas once and reuse
const emailSchema = z.string().email()
```

### 2. Use Lazy Evaluation

```typescript
const schema = z.lazy(() => complexSchema)
```

### 3. Avoid Unnecessary Transformations

```typescript
// Only transform when needed
const schema = z.string().transform((val) => val.trim())
```

### 4. Cache Parsed Results

```typescript
const cache = new Map()

function parseWithCache(schema: z.ZodSchema, data: any) {
  const key = JSON.stringify(data)
  if (cache.has(key)) {
    return cache.get(key)
  }
  const result = schema.parse(data)
  cache.set(key, result)
  return result
}
```

## Integration with Tools

### Express.js

```typescript
import express from 'express'
import { z } from 'zod'

const app = express()

app.post('/users', (req, res) => {
  const result = userSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors })
  }
  // Process valid data
})
```

### Next.js

```typescript
import { z } from 'zod'

const userSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

export async function POST(request: Request) {
  const body = await request.json()
  const result = userSchema.safeParse(body)
  
  if (!result.success) {
    return Response.json({ errors: result.error.errors }, { status: 400 })
  }
  
  // Process valid data
}
```

### React Hook Form

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

function MyForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema)
  })

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('name')} />
      <input {...register('email')} />
      <button type="submit">Submit</button>
    </form>
  )
}
```

## Common Commands

```bash
# Install Zod
npm install zod

# Install with React Hook Form
npm install @hookform/resolvers zod
```

## Troubleshooting

### Common Issues

**Type errors**:
- Ensure TypeScript version is compatible
- Check for circular type references
- Verify schema definitions

**Validation errors**:
- Check schema definitions
- Verify data structure
- Review error messages

**Performance issues**:
- Reuse schemas instead of recreating
- Use lazy evaluation for complex schemas
- Cache parsed results

### Debugging

```typescript
// Enable debug mode
const result = schema.safeParse(data)
if (!result.success) {
  console.log(result.error.errors)
}
```

## Best Practices

1. **Use type inference** to keep types in sync
2. **Handle errors gracefully** with safeParse
3. **Add custom error messages** for better UX
4. **Validate at boundaries** (API, forms, etc.)
5. **Reuse schemas** to avoid duplication
6. **Use refinements** for custom validation
7. **Transform data** during parsing when needed
8. **Compose schemas** for complex structures
9. **Document schemas** for team understanding
10. **Test validation** thoroughly
11. **Use async validation** when needed
12. **Keep schemas simple** and focused
13. **Use discriminated unions** for variant types
14. **Implement proper error handling**
15. **Monitor validation performance**

## Resources

- [Official Zod Documentation](https://zod.dev)
- [Zod GitHub Repository](https://github.com/colinhacks/zod)
- [Zod Recipes](https://zod.dev/?id=recipes)
- [React Hook Form Integration](https://www.react-hook-form.com/docs/zod)
