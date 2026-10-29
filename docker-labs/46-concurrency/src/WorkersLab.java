import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

final class WorkersLab {
    record Result(int active, int queued, int rejected, int completed) {}
    record Order(String body, String result) {}
    static final class Dedup {
        final ConcurrentHashMap<String, Order> orders = new ConcurrentHashMap<>();
        final AtomicInteger effects = new AtomicInteger();

        String execute(String key, String body) {
            return orders.compute(key, (id, existing) -> {
                if (existing != null) {
                    if (!existing.body().equals(body)) throw new IllegalArgumentException("same key, different body");
                    return existing;
                }
                return new Order(body, "order-" + effects.incrementAndGet());
            }).result();
        }
    }

    static Result executor(boolean bounded) throws InterruptedException {
        BlockingQueue<Runnable> queue = bounded ? new ArrayBlockingQueue<>(2) : new LinkedBlockingQueue<>();
        ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,
            queue, new ThreadPoolExecutor.AbortPolicy());
        CountDownLatch started = new CountDownLatch(2), finish = new CountDownLatch(1);
        AtomicInteger completed = new AtomicInteger();
        Runnable job = () -> {
            started.countDown();
            try { LabSupport.await(finish); completed.incrementAndGet(); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        };
        try {
            pool.execute(job); pool.execute(job);
            LabSupport.await(started);
            int rejected = 0;
            for (int i = 0; i < 3; i++) {
                try { pool.execute(job); }
                catch (RejectedExecutionException expected) { rejected++; }
            }
            int active = pool.getActiveCount(), queued = queue.size();
            finish.countDown(); pool.shutdown();
            LabSupport.require(pool.awaitTermination(3, TimeUnit.SECONDS), "Executor shutdown deadline");
            return new Result(active, queued, rejected, completed.get());
        } finally {
            finish.countDown(); pool.shutdownNow();
            LabSupport.require(pool.awaitTermination(3, TimeUnit.SECONDS), "Executor cleanup deadline");
        }
    }

    static int duplicateBroken() throws InterruptedException {
        ConcurrentHashMap<String, String> results = new ConcurrentHashMap<>();
        AtomicInteger effects = new AtomicInteger();
        CountDownLatch checked = new CountDownLatch(2);
        Runnable request = () -> {
            if (results.get("payment-7") == null) {
                checked.countDown();
                try { LabSupport.await(checked); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
                String result = "order-" + effects.incrementAndGet();
                results.put("payment-7", result);
            }
        };
        Thread a = new Thread(request), b = new Thread(request);
        a.start(); b.start(); LabSupport.join(a); LabSupport.join(b);
        return effects.get();
    }

    static Dedup duplicateFixed() throws InterruptedException {
        Dedup dedup = new Dedup();
        CountDownLatch start = new CountDownLatch(1);
        java.util.List<String> replies = new java.util.concurrent.CopyOnWriteArrayList<>();
        Thread[] threads = new Thread[4];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                try { LabSupport.await(start); replies.add(dedup.execute("payment-7", "100 INR")); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
            threads[i].start();
        }
        start.countDown();
        for (Thread t : threads) LabSupport.join(t);
        LabSupport.require(replies.size() == 4 && replies.stream().allMatch("order-1"::equals), "Duplicate replies differ");
        return dedup;
    }

    static void run() throws InterruptedException {
        System.out.println("ASLI JAVA EXECUTOR; first 2 jobs latch par roke, phir 3 aur bheje");
        for (boolean bounded : new boolean[]{false, true}) {
            Result r = executor(bounded);
            System.out.println((bounded ? "bounded" : "unbounded") + ": active=" + r.active() + " queued=" + r.queued()
                + " rejected=" + r.rejected() + " completed=" + r.completed());
        }
        System.out.println("check-then-act: same key, effects=" + duplicateBroken());
        Dedup fixed = duplicateFixed();
        System.out.println("atomic per-key claim: requests=4 effects=" + fixed.effects.get() + " replies=order-1 x4");
        boolean conflict = false;
        try { fixed.execute("payment-7", "200 INR"); }
        catch (IllegalArgumentException expected) { conflict = true; }
        System.out.println("same key different body rejected=" + conflict);
        System.out.println("BOUNDARY: one JVM, memory only; crash/multi-pod/external charge guarantee nahi.");
    }
}
