import Head from 'next/head'
import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client'
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';
import Link from 'next/link';

import Header from '../../components/Header/index'
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  uid: string,
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      headling: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      }
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      }
    }[];
  }
}

export default function Post({ post, navigation, preview }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>
  }

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  )

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.headling.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length)
    
    words.map(word => (total += word))

    return total;
  }, 0)

  const readTime = Math.ceil(totalWords / 200);

  let dateEdit;
  const isPostEdited = post.first_publication_date !== post.last_publication_date

  if (isPostEdited) {
    dateEdit = format(
      new Date(post.last_publication_date),
      "'* editado em' dd MMM yyyy', às' H':'m",
      {
        locale: ptBR,
      }
    );
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <Header />      
      <img src={post.data.banner.url} alt='banner' className={styles.banner}/>
      <main className={commonStyles.container} >
        <div className={styles.post}>
          <h1>{post.data.title}</h1>
          <ul>
            <FiCalendar /><li>{formattedDate}</li>
            <FiUser /><li>{post.data.author}</li>
            <FiClock /><li>{`${readTime} min`}</li>
          </ul>
          
          {isPostEdited && <span>{dateEdit}</span>}

        </div>

        {post.data.content.map(content => {
          return (
            <article key={content.headling} className={styles.content}>
              <h2>{content.headling}</h2>
              <div 
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          )
        })}

        <section className={`${commonStyles.container} ${styles.navigation}`}>
          {navigation?.prevPost.length > 0 && (
            <div>
              <Link href={`/post/${navigation.prevPost[0].uid}`}>                
                <a>
                  <h3>{navigation.prevPost[0].data.title}</h3>
                  <p>Post anterior</p>
                </a>
              </Link>
            </div>            
          )}

          {navigation?.nextPost.length > 0 && (
            <div>
              <Link href={`/post/${navigation.nextPost[0].uid}`}>
                <a>
                  <h3>{navigation.nextPost[0].data.title}</h3>
                  <p>Próximo post</p>
                </a>
              </Link>
            </div>            
          )}
        </section>

        <Comments />

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    }
  })

  return {
    paths,
    fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();  
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const prevPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]'
    }
  )

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]'
    }
  )

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          headling: content.headling,
          body: [...content.body]
        }
      }),
    },
  };

  return {
    props: {
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
      preview,
    }
  }
};
